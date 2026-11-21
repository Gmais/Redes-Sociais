// Testa a análise com IA: cálculo dos números, o que sai para a OpenAI, validação da resposta,
// gravação em ai_analyses e permissões. Sem rede: a OpenAI e o Supabase são simulados.
const assert = require('assert');
const ia = require('../lib/analise-ia');
const analise = require('../lib/analise-api');

const CFG = { url: 'https://projeto.supabase.test', anon: 'a', service: 's' };
const ORG = '22222222-2222-2222-2222-222222222222';
const USUARIO = '11111111-1111-1111-1111-111111111111';
const CONTA = '33333333-3333-3333-3333-333333333333';
const CONTA_ESTRANHA = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
const C1 = '7c1d0c00-0000-4000-8000-000000000001';
const AGORA = Date.parse('2026-11-21T15:00:00Z');
const INI = '2026-11-11';
const FIM = '2026-11-20';

const resposta = (status, corpo) => {
  const texto = corpo === undefined ? '' : JSON.stringify(corpo);
  return { ok: status >= 200 && status < 300, status, text: async () => texto, json: async () => JSON.parse(texto || '[]') };
};

const LINHAS = [
  { metric_date: '2026-11-11', social_account_id: CONTA, reach: 120, views: 150, engagement: 12, website_clicks: 3, followers_count: 1002 },
  { metric_date: '2026-11-12', social_account_id: CONTA, reach: 130, views: 140, engagement: 13, website_clicks: 4, followers_count: 1004 }
];
// A legenda é um segredo de teste: nunca pode aparecer no pedido à IA.
const POSTS = [
  { id: 'p1', social_account_id: CONTA, content_type: 'reel', permalink: null, thumbnail_url: null, caption: 'LEGENDA-SECRETA-123 💪', published_at: '2026-11-15T15:00:00Z' },
  { id: 'p2', social_account_id: CONTA, content_type: 'post', permalink: null, thumbnail_url: null, caption: 'Outra legenda', published_at: '2026-11-18T12:00:00Z' },
  { id: 'p0', social_account_id: CONTA, content_type: 'post', permalink: null, thumbnail_url: null, caption: 'Antiga', published_at: '2026-10-01T12:00:00Z' }
];
const INSIGHTS = [
  { social_post_id: 'p1', reach: 500, views: 800, likes: 40, comments: 4, shares: 1, saves: 2, engagement: 47, follows_gained: null, collected_at: '2026-11-20T00:00:00Z' },
  { social_post_id: 'p2', reach: 300, views: 400, likes: 20, comments: 6, shares: 0, saves: 1, engagement: 27, follows_gained: 3, collected_at: '2026-11-20T00:00:00Z' }
];
const SNAPS_CONC = [
  { competitor_id: C1, captured_at: '2026-11-20T12:00:00Z', followers_count: 1200, media_count: 210, publicacoes_30d: 3, engajamento_medio: '15.3', amostra_publicacoes: 4, tipos: { post: 2 }, ultima_publicacao_em: '2026-11-19T10:00:00Z' }
];
const ANALISE_OK = {
  resumo: 'Alcance de 250 nos dois dias com dados.',
  pontos_fortes: ['Reel com 47 de engajamento'],
  pontos_de_atencao: ['Amostra pequena: 2 publicações'],
  proximos_passos: ['Publicar mais posts de feed para comparar'],
  limitacoes: ['Impressões não disponíveis']
};
const OPENAI_OK = () => resposta(200, { choices: [{ message: { content: JSON.stringify(ANALISE_OK) } }] });

function criarFake({ papel = 'editor', linhas = LINHAS, posts = POSTS, openai = OPENAI_OK, historico = [] } = {}) {
  const log = [];
  const gravadas = [];
  const f = async (url, init = {}) => {
    const u = new URL(url);
    const metodo = (init.method || 'GET').toUpperCase();
    const corpo = init.body ? JSON.parse(init.body) : undefined;
    log.push({ metodo, u, corpo });
    if (u.hostname === 'api.openai.com') return openai(corpo);
    const off = Number(u.searchParams.get('offset') || 0);
    const pagina = (arr) => resposta(200, arr.slice(off, off + 1000));
    if (u.pathname === '/auth/v1/user') return resposta(200, { id: USUARIO });
    if (u.pathname === '/rest/v1/organization_members') return resposta(200, papel ? [{ role: papel }] : []);
    if (u.pathname === '/rest/v1/account_insights') return pagina(linhas);
    if (u.pathname === '/rest/v1/social_accounts') return resposta(200, [{ id: CONTA, platform: 'instagram', username: 'academia', external_id: '1784140' }]);
    if (u.pathname === '/rest/v1/audience_insights') return resposta(200, []);
    if (u.pathname === '/rest/v1/social_posts') return resposta(200, posts);
    if (u.pathname === '/rest/v1/post_insights') return pagina(INSIGHTS);
    if (u.pathname === '/rest/v1/competitor_accounts') return resposta(200, [{ id: C1, handle: 'concorrente.x', display_name: null }]);
    if (u.pathname === '/rest/v1/competitor_snapshots') return pagina(SNAPS_CONC);
    if (u.pathname === '/rest/v1/ai_analyses' && metodo === 'POST') {
      const linha = { id: 'ana-' + (gravadas.length + 1), created_at: '2026-11-21T15:00:00Z', ...corpo };
      gravadas.push(linha);
      return resposta(201, [linha]);
    }
    if (u.pathname === '/rest/v1/ai_analyses') return resposta(200, historico);
    return resposta(404, {});
  };
  return { f, log, gravadas };
}

const env = (extra = {}) => ({ OPENAI_API_KEY: 'chave-teste', ...extra });
const chamadasOpenAI = (log) => log.filter((x) => x.u.hostname === 'api.openai.com');

async function analisar(fake, extra = {}) {
  return ia.analisarPeriodo({ orgId: ORG, userId: USUARIO, contaId: null, ini: INI, fim: FIM, cfg: CFG, f: fake.f, env: env(extra.env), agora: AGORA, ...extra.opcoes });
}

(async () => {
  // ── Funções puras ──────────────────────────────────────────────────────────────
  assert.strictEqual(ia.media([1, null, 3]), 2, 'null não conta como zero');
  assert.strictEqual(ia.media([]), null);
  assert.strictEqual(ia.curtidasMaisComentarios({ curtidas: null, comentarios: null }), null);
  assert.strictEqual(ia.curtidasMaisComentarios({ curtidas: 5, comentarios: null }), 5);

  const porTipo = ia.resumoPorTipo([
    { tipo: 'reel', alcance: 100, engajamento: 10, curtidas: 8, comentarios: 2 },
    { tipo: 'reel', alcance: null, engajamento: null, curtidas: null, comentarios: null }
  ]);
  assert.deepStrictEqual(porTipo.reel, { quantidade: 2, alcanceMedio: 100, engajamentoMedio: 10, mediaCurtidasMaisComentarios: 10 });

  // ── Validação da resposta ──────────────────────────────────────────────────────
  const v = ia.validarResposta(JSON.stringify({ ...ANALISE_OK, pontos_fortes: ['a', 'b', 'c', 'd', 'e'], proximos_passos: 'nao-lista' }));
  assert.strictEqual(v.pontos_fortes.length, 4, 'no máximo 4 itens por lista');
  assert.deepStrictEqual(v.proximos_passos, [], 'campo que não é lista vira lista vazia');
  assert.throws(() => ia.validarResposta(JSON.stringify({ pontos_fortes: [] })), (e) => e instanceof ia.ErroIA && /válida/.test(e.message));
  assert.throws(() => ia.validarResposta('null'), (e) => e instanceof ia.ErroIA);
  assert.throws(() => ia.validarResposta('não é json'), (e) => e instanceof ia.ErroIA);
  const longo = ia.validarResposta(JSON.stringify({ resumo: '💪'.repeat(1300) }));
  assert.strictEqual(Array.from(longo.resumo).length, 1200, 'corta por caractere');
  assert.ok(!/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/.test(longo.resumo), 'não deixa emoji partido');

  // ── Caminho feliz: números calculados aqui, nada de legenda no pedido ──────────
  const ok = criarFake();
  const r = await analisar(ok);
  assert.strictEqual(r.status, 'ok');
  assert.strictEqual(r.modelo, 'gpt-4.1');
  assert.strictEqual(r.analise.resumo, ANALISE_OK.resumo);
  assert.strictEqual(r.enviado.publicacoes, 2, 'a publicação de outubro fica fora do período');

  const pedidos = chamadasOpenAI(ok.log);
  assert.strictEqual(pedidos.length, 1);
  const pedidoUsuario = pedidos[0].corpo.messages[1].content;
  assert.ok(!pedidoUsuario.includes('LEGENDA-SECRETA'), 'legenda nunca vai para a IA');
  assert.ok(!pedidoUsuario.includes('Outra legenda'));
  assert.ok(pedidoUsuario.includes('"porTipo"'), 'o pedido traz as médias por tipo');
  assert.strictEqual(pedidos[0].corpo.response_format.type, 'json_object');

  const gravada = ok.gravadas[0];
  assert.strictEqual(gravada.kind, 'periodo');
  assert.strictEqual(gravada.status, 'ok');
  assert.strictEqual(gravada.organization_id, ORG);
  assert.strictEqual(gravada.requested_by, USUARIO);
  assert.strictEqual(gravada.social_account_id, null, 'sem filtro de conta: null');
  assert.strictEqual(gravada.period_start, INI);
  assert.strictEqual(gravada.period_end, FIM);
  assert.strictEqual(gravada.model, 'gpt-4.1');
  assert.strictEqual(JSON.parse(gravada.output).resumo, ANALISE_OK.resumo);
  assert.strictEqual(gravada.input_summary.visao.totais.alcance, 250, 'alcance do período: 120 + 130');
  assert.strictEqual(gravada.input_summary.publicacoes.porTipo.reel.engajamentoMedio, 47);
  assert.strictEqual(gravada.input_summary.horarios.suficiente, false, 'menos de 10 publicações: sem ranking de horários');
  assert.strictEqual(gravada.input_summary.concorrentes[0].perfil, 'concorrente.x');
  assert.ok(!JSON.stringify(gravada.input_summary).includes('LEGENDA-SECRETA'), 'o resumo guardado também não tem legenda');

  // ── Período sem dado: não chama a IA e diz a limitação ─────────────────────────
  const vazio = criarFake({ linhas: [], posts: [] });
  const rv = await analisar(vazio);
  assert.strictEqual(rv.status, 'insufficient_data');
  assert.strictEqual(chamadasOpenAI(vazio.log).length, 0, 'sem dado, a IA não é chamada');
  assert.ok(/Não há dados sincronizados/.test(rv.analise.limitacoes[0]));
  assert.strictEqual(vazio.gravadas[0].status, 'insufficient_data');

  // ── Conta de outra organização não entra ───────────────────────────────────────
  const estranha = criarFake();
  await assert.rejects(ia.analisarPeriodo({ orgId: ORG, userId: USUARIO, contaId: CONTA_ESTRANHA, ini: INI, fim: FIM, cfg: CFG, f: estranha.f, env: env(), agora: AGORA }),
    (e) => e instanceof ia.ErroIA && e.status === 400);
  assert.strictEqual(chamadasOpenAI(estranha.log).length, 0);

  // ── Modelo que falha passa para o próximo ──────────────────────────────────────
  const fallback = criarFake({ openai: (corpo) => corpo.model === 'gpt-4.1' ? resposta(404, {}) : OPENAI_OK() });
  const rf = await analisar(fallback);
  assert.strictEqual(rf.modelo, 'gpt-4o');

  // ── Falha da IA: grava como erro e devolve mensagem clara ──────────────────────
  const falha = criarFake({ openai: () => resposta(500, { error: 'boom' }) });
  await assert.rejects(analisar(falha), (e) => e instanceof ia.ErroIA && e.status === 502 && /não respondeu/.test(e.message));
  assert.strictEqual(falha.gravadas[0].status, 'error');
  assert.strictEqual(JSON.parse(falha.gravadas[0].output).limitacoes.length, 1);

  // ── Resposta fora do formato: grava como erro ──────────────────────────────────
  const ruim = criarFake({ openai: () => resposta(200, { choices: [{ message: { content: 'texto solto' } }] }) });
  await assert.rejects(analisar(ruim), (e) => e instanceof ia.ErroIA && /válida/.test(e.message));
  assert.strictEqual(ruim.gravadas[0].status, 'error');

  // ── Handlers: permissões e validações ───────────────────────────────────────────
  const deps = (f, extra = {}) => ({ env: { OPENAI_API_KEY: 'chave-teste', ...extra }, config: CFG, fetch: f, agora: () => AGORA });
  const chamar = async (rota, f, { query = {}, corpo, metodo = 'POST', envExtra = {} } = {}) => {
    const cbs = {};
    const req = { method: metodo, query, headers: { authorization: 'Bearer t' }, on(ev, cb) { cbs[ev] = cb; return req; } };
    const res = { statusCode: 200, body: undefined, status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; return this; } };
    const p = analise.HANDLERS[rota](req, res, deps(f, envExtra));
    if (metodo !== 'GET') {
      if (cbs.data) cbs.data(corpo === undefined ? '' : JSON.stringify(corpo));
      if (cbs.end) cbs.end();
    }
    await p;
    return res;
  };

  let h = await chamar('ia-analisar', criarFake({ papel: 'viewer' }).f, { corpo: { orgId: ORG, ini: INI, fim: FIM } });
  assert.strictEqual(h.statusCode, 403, 'viewer não gera análise (gasta crédito da OpenAI)');

  h = await chamar('ia-analisar', criarFake().f, { corpo: { orgId: ORG, ini: FIM, fim: INI } });
  assert.strictEqual(h.statusCode, 400, 'período invertido');

  h = await chamar('ia-analisar', criarFake().f, { corpo: { orgId: ORG, ini: INI, fim: FIM, conta: 'nao-e-uuid' } });
  assert.strictEqual(h.statusCode, 400, 'conta com formato inválido');

  h = await chamar('ia-analisar', criarFake().f, { corpo: { orgId: ORG, ini: INI, fim: FIM }, envExtra: { OPENAI_API_KEY: undefined } });
  assert.strictEqual(h.statusCode, 500, 'sem chave da OpenAI, avisa');

  h = await chamar('ia-analisar', criarFake().f, { corpo: { orgId: ORG, ini: INI, fim: FIM } });
  assert.strictEqual(h.statusCode, 200);
  assert.strictEqual(h.body.ok, true);
  assert.strictEqual(h.body.analise.resumo, ANALISE_OK.resumo);

  const historicoFake = criarFake({ historico: [{ id: 'ana-9', status: 'ok', period_start: INI, period_end: FIM, output: JSON.stringify(ANALISE_OK), model: 'gpt-4.1', created_at: '2026-11-21T15:00:00Z' }] });
  h = await chamar('ia-historico', historicoFake.f, { metodo: 'GET', query: { org: ORG } });
  assert.strictEqual(h.statusCode, 200);
  assert.strictEqual(h.body.papel, 'editor');
  assert.strictEqual(h.body.analises[0].analise.resumo, ANALISE_OK.resumo);
  assert.deepStrictEqual(h.body.analises[0].periodo, { ini: INI, fim: FIM });

  h = await chamar('ia-historico', criarFake({ papel: 'viewer', historico: [] }).f, { metodo: 'GET', query: { org: ORG } });
  assert.strictEqual(h.statusCode, 200, 'viewer lê o histórico');
  assert.strictEqual(h.body.papel, 'viewer');

  console.log('ok (analise-ia)');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
