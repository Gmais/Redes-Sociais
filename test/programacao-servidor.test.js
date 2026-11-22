// Programação no servidor: cria a semana e agenda na Zernio. Supabase e Zernio simulados (sem rede).
const assert = require('assert');
const S = require('../lib/programacao-servidor.js');

(async () => {

const ENV = {
  SUPABASE_URL: 'https://exemplo.supabase.co', SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_ROLE_KEY: 'service',
  ZERNIO_API_KEY: 'chave-zernio', ZERNIO_API_KEY_GYMPULSE: 'chave-gympulse'
};
const ZERNIO = 'https://zernio.com/api/v1/posts';
const CONTA_ACADEMIA = '6ace80c0a737012bc49cb80c';

// Banco simulado: linhas do painel_gilson_state, a RPC merge_panel_state (união por id) e a Zernio.
function criarBanco(estado = {}, respostasZernio = []) {
  const linhas = JSON.parse(JSON.stringify(estado));
  const zernio = [];
  let n = 0;
  const resposta = (status, texto) => ({
    ok: status >= 200 && status < 300, status, text: async () => texto, json: async () => JSON.parse(texto)
  });
  const f = async (url, opts = {}) => {
    const metodo = opts.method || 'GET';
    const corpo = opts.body ? JSON.parse(opts.body) : undefined;
    if (url.startsWith(ZERNIO)) {
      zernio.push({ headers: opts.headers, corpo });
      const r = respostasZernio.length ? respostasZernio.shift() : { status: 200, body: { post: { _id: 'zp' + (++n) } } };
      return resposta(r.status, JSON.stringify(r.body));
    }
    if (url.endsWith('/rest/v1/rpc/merge_panel_state')) {
      Object.keys(corpo.patches).forEach((k) => {
        linhas[k] = Object.assign({}, linhas[k] || {}, corpo.patches[k]);
      });
      return resposta(200, '');
    }
    if (url.includes('/rest/v1/painel_gilson_state')) {
      if (metodo === 'GET') {
        const chaves = url.split('key=in.(')[1].split(')')[0].split(',');
        return resposta(200, JSON.stringify(chaves.filter((k) => k in linhas).map((k) => ({ key: k, value: linhas[k] }))));
      }
      corpo.forEach((l) => { linhas[l.key] = l.value; });
      return resposta(201, '');
    }
    throw new Error('URL inesperada no teste: ' + url);
  };
  return { f, linhas, zernio };
}

const ID = 'ac_prog_promo_20261123';
const DOMINGO = Date.parse('2026-11-22T11:30:00Z'); // 22/11, 08:30 em Brasília
const SEGUNDA = Date.parse('2026-11-23T11:30:00Z'); // 23/11, 08:30 em Brasília
const SEGUNDA_30 = Date.parse('2026-11-30T11:30:00Z');
const VARIANTE = { id: 'a', titulo: 'Semana 1', texto: 'Texto da semana 1', imagem: 'https://img.exemplo.com/a.jpg' };
const SEM_CRIAR = { criados: 0, agendados: 0, erros: 0, sem_dados: 0, sem_chave: 0, pendentes_proxima_execucao: 0, aguardando: 0 };

function regra(extra = {}) {
  return Object.assign({
    id: 'promo', nome: 'Promoção', empresa: 'academia', dias: [1], hora: '09:00', formato: 'Post',
    pularFeriados: true, ativa: true, gerados: {}, proximo: 0, variantes: [VARIANTE]
  }, extra);
}
const PROG = (r) => ({ programacao: { regras: [r], feriadosExtras: [] } });

// 1. Data no fuso de Brasília
assert.strictEqual(S.hojeBR(DOMINGO), '2026-11-22');
assert.strictEqual(S.hojeBR(Date.parse('2026-11-23T02:30:00Z')), '2026-11-22', 'às 23h30 de Brasília ainda é o dia anterior');

// 2. Card no mesmo formato que o painel grava (sem id, com a ficha de formato)
{
  const card = S.cardDaProgramacao(regra(), { data: '2026-11-23', variante: VARIANTE, cardId: ID });
  assert.deepStrictEqual(Object.keys(card), ['date', 'time', 'format', 'title', 'texto', 'secoes']);
  assert.strictEqual(card.time, '09h00');
  assert.ok(card.secoes[0].conteudo.includes('Post Feed Instagram'));
}

// 3. Primeira execução: cria o card da segunda, grava e agenda na Zernio no horário de Brasília
{
  const banco = criarBanco(PROG(regra()));
  const r = await S.gerarEAgendar({ env: ENV, f: banco.f, agora: DOMINGO, pausa: 0 });
  assert.deepStrictEqual(r, Object.assign({}, SEM_CRIAR, { criados: 1, agendados: 1 }));
  const card = banco.linhas.edits[ID];
  assert.ok(card, 'card gravado em edits');
  assert.strictEqual(card.id, undefined, 'o card não leva id, como no painel');
  assert.strictEqual(card.title, 'Semana 1');
  assert.strictEqual(banco.linhas.images[ID].zernioUrl, VARIANTE.imagem);
  assert.strictEqual(banco.linhas.programacao.regras[0].proximo, 1);
  assert.strictEqual(banco.linhas.programacao.regras[0].gerados['2026-11-23'], ID);
  assert.strictEqual(banco.zernio.length, 1);
  const envio = banco.zernio[0];
  assert.strictEqual(envio.headers.Authorization, 'Bearer chave-zernio');
  assert.strictEqual(envio.corpo.content, 'Texto da semana 1');
  assert.deepStrictEqual(envio.corpo.mediaItems, [{ type: 'image', url: VARIANTE.imagem }]);
  assert.deepStrictEqual(envio.corpo.platforms, [{ platform: 'instagram', accountId: CONTA_ACADEMIA }]);
  assert.strictEqual(envio.corpo.scheduledFor, '2026-11-23T12:00:00.000Z', '09h00 de Brasília = 12h UTC');
  assert.strictEqual(envio.corpo.timezone, 'America/Sao_Paulo');
  assert.strictEqual(banco.linhas.published[ID].status, 'sent');
  assert.strictEqual(banco.linhas.published[ID].postId, 'zp1');

  // 4. Rodar de novo no dia seguinte: nada novo e nada reenviado
  const r2 = await S.gerarEAgendar({ env: ENV, f: banco.f, agora: SEGUNDA, pausa: 0 });
  assert.deepStrictEqual(r2, SEM_CRIAR);
  assert.strictEqual(banco.zernio.length, 1, 'o mesmo post não é agendado duas vezes');

  // 5. Na segunda seguinte cria e agenda a próxima semana, e a sequência continua
  const r3 = await S.gerarEAgendar({ env: ENV, f: banco.f, agora: SEGUNDA_30, pausa: 0 });
  assert.strictEqual(r3.criados, 1);
  assert.strictEqual(r3.agendados, 1);
  assert.strictEqual(banco.zernio.length, 2);
  assert.strictEqual(banco.linhas.programacao.regras[0].proximo, 2);
}

// 6. Sem imagem: não vai à Zernio; quando a imagem chega, a execução seguinte agenda
{
  const banco = criarBanco(PROG(regra({ variantes: [{ id: 'b', titulo: 'Sem foto', texto: 'Texto' }] })));
  const r1 = await S.gerarEAgendar({ env: ENV, f: banco.f, agora: DOMINGO, pausa: 0 });
  assert.deepStrictEqual(r1, Object.assign({}, SEM_CRIAR, { criados: 1, sem_dados: 1 }));
  assert.strictEqual(banco.zernio.length, 0);
  banco.linhas.images = Object.assign({}, banco.linhas.images, {
    [ID]: { status: 'ok', zernioUrl: 'https://img.exemplo.com/b.jpg', zernioStatus: 'ok' }
  });
  const r2 = await S.gerarEAgendar({ env: ENV, f: banco.f, agora: SEGUNDA, pausa: 0 });
  assert.strictEqual(r2.agendados, 1);
  assert.strictEqual(banco.zernio.length, 1);
}

// 7. Zernio recusa: fica como erro no card e não é reenviado sozinho
{
  const banco = criarBanco(PROG(regra()), [{ status: 400, body: { error: 'media URL inválida' } }]);
  const r1 = await S.gerarEAgendar({ env: ENV, f: banco.f, agora: DOMINGO, pausa: 0 });
  assert.strictEqual(r1.erros, 1);
  assert.strictEqual(banco.linhas.published[ID].status, 'error');
  assert.ok(banco.linhas.published[ID].errorMsg.includes('media URL inválida'));
  await S.gerarEAgendar({ env: ENV, f: banco.f, agora: SEGUNDA, pausa: 0 });
  assert.strictEqual(banco.zernio.length, 1, 'erro não é reenviado sozinho');
}

// 8. Queda no meio do envio: card marcado como "publishing" não é enviado de novo
{
  const banco = criarBanco(Object.assign(PROG(regra()), {
    published: { [ID]: { status: 'publishing', startedAt: '2026-11-22T11:00:00.000Z' } }
  }));
  const r = await S.gerarEAgendar({ env: ENV, f: banco.f, agora: DOMINGO, pausa: 0 });
  assert.strictEqual(r.agendados, 0);
  assert.strictEqual(banco.zernio.length, 0);
}

// 9. Card apagado pela pessoa não é criado nem agendado
{
  const banco = criarBanco(Object.assign(PROG(regra()), { deleted: [ID] }));
  const r = await S.gerarEAgendar({ env: ENV, f: banco.f, agora: DOMINGO, pausa: 0 });
  assert.strictEqual(r.criados, 0);
  assert.strictEqual(r.agendados, 0);
  assert.strictEqual(banco.zernio.length, 0);
  assert.strictEqual(banco.linhas.edits, undefined, 'nada gravado para o card apagado');
}

// 10. Sem a chave da conta no Vercel: não marca nada e avisa
{
  const banco = criarBanco(PROG(regra()));
  const r = await S.gerarEAgendar({ env: Object.assign({}, ENV, { ZERNIO_API_KEY: '' }), f: banco.f, agora: DOMINGO, pausa: 0 });
  assert.strictEqual(r.sem_chave, 1);
  assert.strictEqual(banco.linhas.published, undefined);
  assert.strictEqual(banco.zernio.length, 0);
}

// 11. Estouro do tempo da rota: o que sobra fica para a próxima execução
{
  const banco = criarBanco(PROG(regra()));
  const r = await S.gerarEAgendar({ env: ENV, f: banco.f, agora: DOMINGO, pausa: 0, orcamentoMs: -1 });
  assert.strictEqual(r.pendentes_proxima_execucao, 1);
  assert.strictEqual(banco.zernio.length, 0);
}

// 12. Story vai como story; vídeo vai como vídeo; cada empresa usa a sua conta e a sua chave
{
  const banco = criarBanco();
  await S.agendarNaZernio({
    empresa: 'sorveteria', card: { date: '2026-11-23', time: '18h00', format: 'Story', texto: 'Oi' },
    imagem: 'https://x.exemplo.com/v.mp4', env: ENV, f: banco.f, agora: DOMINGO
  });
  const e = banco.zernio[0].corpo;
  assert.strictEqual(e.mediaItems[0].type, 'video');
  assert.deepStrictEqual(e.platforms[0], {
    platform: 'instagram', accountId: '6a3916335f7d1751ab4afbe3', platformSpecificData: { contentType: 'story' }
  });
  assert.strictEqual(banco.zernio[0].headers.Authorization, 'Bearer chave-zernio');
}
{
  const banco = criarBanco();
  await S.agendarNaZernio({
    empresa: 'gympulse', card: { date: '2026-11-23', time: '10h00', format: 'Post', texto: 'Oi' },
    imagem: 'https://x.exemplo.com/a.jpg', env: ENV, f: banco.f, agora: DOMINGO
  });
  assert.strictEqual(banco.zernio[0].headers.Authorization, 'Bearer chave-gympulse');
  assert.strictEqual(banco.zernio[0].corpo.scheduledFor, '2026-11-23T13:00:00.000Z');
}

// 13. Só agenda hoje e amanhã: card de 29/11 espera até 28/11 (dia anterior)
{
  const ID29 = 'ac_prog_promo_20261129';
  const card29 = { date: '2026-11-29', time: '09h00', format: 'Post', title: 'Dom', texto: 'Texto', secoes: [] };
  const banco = criarBanco({
    programacao: { regras: [], feriadosExtras: [] },
    edits: { [ID29]: card29 },
    images: { [ID29]: { status: 'ok', zernioUrl: 'https://img.exemplo.com/c.jpg', zernioStatus: 'ok' } }
  });
  const r1 = await S.gerarEAgendar({ env: ENV, f: banco.f, agora: DOMINGO, pausa: 0 });
  assert.strictEqual(r1.aguardando, 1, 'card de 29/11 ainda não é agendado no dia 22');
  assert.strictEqual(banco.zernio.length, 0);
  const r2 = await S.gerarEAgendar({ env: ENV, f: banco.f, agora: Date.parse('2026-11-28T11:30:00Z'), pausa: 0 });
  assert.strictEqual(r2.agendados, 1, 'no dia 28 (sábado) o card de 29/11 é agendado');
  assert.strictEqual(banco.zernio.length, 1);
  assert.strictEqual(banco.zernio[0].corpo.scheduledFor, '2026-11-29T12:00:00.000Z');
}

console.log('programacao-servidor: ok');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
