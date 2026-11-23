// "Gerar nova postagem" do editor de card: POST /api/auto-content { acao: 'tema', ... }.
// OpenAI e Supabase simulados; nada sai da máquina.
const assert = require('assert');
const handler = require('../api/auto-content.js');
const { temaOutputRules, systemPrompt, AUTO_OUTPUT_RULES } = handler._tema;

function resFake() {
  const r = { statusCode: 200, corpo: null };
  r.status = (c) => { r.statusCode = c; return r; };
  r.json = (b) => { r.corpo = b; return r; };
  return r;
}

const ROWS = [
  { key: 'manifest', value: {
    ac_2311_1: { profile: 'academia', date: '2026-11-24', time: '07h00', format: 'Story', caption: 'Legenda vizinha sobre hidratação' },
    ac_2311_2: { profile: 'academia', date: '2026-11-24', time: '18h30', format: 'Story', caption: 'Legenda do card que está sendo reescrito' },
    so_2311_1: { profile: 'sorveteria', date: '2026-11-24', time: '09h00', format: 'Story', caption: 'Legenda da sorveteria' }
  } }
];

// fetch simulado: Supabase devolve ROWS (ou falha), OpenAI devolve `resposta`.
function instalarFetch({ resposta, supabaseFalha = false }) {
  const chamadas = { openai: [], supabase: 0 };
  global.fetch = async (url, opts = {}) => {
    if (String(url).includes('supabase.co')) {
      chamadas.supabase++;
      if (supabaseFalha) return { ok: false, status: 500, json: async () => ({}), text: async () => 'erro' };
      return { ok: true, status: 200, json: async () => ROWS };
    }
    if (String(url).includes('api.openai.com')) {
      chamadas.openai.push(JSON.parse(opts.body));
      return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: JSON.stringify(resposta) } }] }) };
    }
    throw new Error('fetch inesperado: ' + url);
  };
  return chamadas;
}

const POST_IA = {
  title: 'Musculação depois dos 40',
  pilar: 'Dica de Saúde', objetivo: 'Educar', publico: 'Mulheres 30-45', tom: 'Acolhedor', cta: 'Chama no direct',
  texto: 'Musculação depois dos 40 — cuida dos ossos e da disposição 💪\n\nVem conhecer a Planeta Corpo Club+.',
  briefing_visual: 'Mulher de 45 anos treinando com halteres leves, luz natural, cores laranja e amarelo da marca.',
  nota: ''
};

(async () => {
  process.env.OPENAI_API_KEY = 'teste';
  delete process.env.EXIGIR_LOGIN_ZERNIO;

  // 1. O Modo Automático continua com as mesmas regras de saída (só Story/Post, JSON com slots).
  {
    const s = systemPrompt('academia', 'CTX', '', '');
    assert.ok(s.includes(AUTO_OUTPUT_RULES));
    assert.ok(s.includes('- Sem Reel e sem Carrossel.'));
    assert.ok(s.includes('com um item por slot, na mesma ordem dos slots'));
  }

  // 2. Regras do tema por formato
  {
    assert.ok(temaOutputRules('Story').includes('Hashtags: 0 hashtags'));
    assert.ok(temaOutputRules('Story').includes('nunca peça para salvar'));
    assert.ok(temaOutputRules('Post').includes('exatamente 5 hashtags'));
    assert.ok(!temaOutputRules('Post').includes('nunca peça para salvar'));
    assert.ok(temaOutputRules('Carrossel').includes('Slide 1'));
    assert.ok(!temaOutputRules('Post').includes('Sem Reel e sem Carrossel'));
  }

  // 3. Caminho feliz: Academia, Post, tema do Gilson
  {
    const chamadas = instalarFetch({ resposta: { posts: [POST_IA] } });
    const res = resFake();
    await handler({ method: 'POST', headers: {}, query: {}, body: {
      acao: 'tema', profile: 'academia', id: 'ac_2311_2', tema: 'musculação para mulheres depois dos 40',
      format: 'Post', date: '2026-11-24', time: '18h30' } }, res);
    assert.strictEqual(res.statusCode, 200, JSON.stringify(res.corpo));
    const p = res.corpo.post;
    assert.strictEqual(p.title, 'Musculação depois dos 40');
    assert.ok(!/[—–]/.test(p.texto), 'travessão sai da legenda');
    assert.ok(p.secoes[0].startsWith('Tipo: Post Feed Instagram\nDimensões: 1080 × 1350px (4:5)'), p.secoes[0]);
    assert.ok(p.secoes[1].includes('Pilar: Dica de Saúde') && p.secoes[1].includes('CTA: Chama no direct'));
    assert.strictEqual(p.secoes[2], POST_IA.briefing_visual);
    assert.strictEqual(p.nota, '');
    assert.strictEqual(chamadas.openai.length, 1);
    const [sys, user] = chamadas.openai[0].messages;
    assert.ok(sys.content.includes('===== CONTEXTO.md ====='), 'manda o CONTEXTO.md');
    assert.ok(sys.content.includes('Formato: Post. Hashtags: exatamente 5'));
    assert.ok(user.content.includes('TEMA pedido pelo Gilson: "musculação para mulheres depois dos 40"'));
    assert.ok(user.content.includes('2026-11-24 (terça-feira), 18h30'));
    assert.ok(user.content.includes('Legenda vizinha sobre hidratação'), 'lista os posts recentes da marca');
    assert.ok(!user.content.includes('Legenda do card que está sendo reescrito'), 'não lista o próprio card');
    assert.ok(!user.content.includes('Legenda da sorveteria'), 'não mistura marcas');
  }

  // 4. Validações (nenhuma chama a OpenAI)
  for (const [body, msg] of [
    [{ acao: 'tema', profile: 'academia', tema: '' }, 'Escreva o tema'],
    [{ acao: 'tema', profile: 'xyz', tema: 'algum tema' }, 'profile inválido'],
    [{ acao: 'tema', profile: 'academia', tema: 'x'.repeat(401) }, 'Tema longo demais']
  ]) {
    const chamadas = instalarFetch({ resposta: { posts: [POST_IA] } });
    const res = resFake();
    await handler({ method: 'POST', headers: {}, query: {}, body }, res);
    assert.strictEqual(res.statusCode, 400);
    assert.ok(res.corpo.error.includes(msg), res.corpo.error);
    assert.strictEqual(chamadas.openai.length, 0);
  }

  // 5. Formato desconhecido vira Story; data inválida vira hoje; Supabase fora não impede de gerar
  {
    const chamadas = instalarFetch({ resposta: { posts: [POST_IA] }, supabaseFalha: true });
    const res = resFake();
    await handler({ method: 'POST', headers: {}, query: {}, body: { acao: 'tema', profile: 'academia', tema: 'dor nas costas', format: 'Live', date: 'ontem' } }, res);
    assert.strictEqual(res.statusCode, 200, JSON.stringify(res.corpo));
    assert.ok(res.corpo.post.secoes[0].startsWith('Tipo: Story Instagram'));
    assert.ok(chamadas.openai[0].messages[1].content.includes('(nada próximo)'));
  }

  // 6. IA sem legenda: erro claro, não preenche o editor com vazio
  {
    instalarFetch({ resposta: { posts: [{ ...POST_IA, texto: '' }] } });
    const res = resFake();
    await handler({ method: 'POST', headers: {}, query: {}, body: { acao: 'tema', profile: 'academia', tema: 'dor nas costas' } }, res);
    assert.strictEqual(res.statusCode, 502);
  }

  // 7. Com EXIGIR_LOGIN_ZERNIO=1 e sem token: 401 antes de gastar com a OpenAI
  {
    process.env.EXIGIR_LOGIN_ZERNIO = '1';
    const chamadas = instalarFetch({ resposta: { posts: [POST_IA] } });
    const res = resFake();
    await handler({ method: 'POST', headers: {}, query: {}, body: { acao: 'tema', profile: 'academia', tema: 'dor nas costas' } }, res);
    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(chamadas.openai.length, 0);
    delete process.env.EXIGIR_LOGIN_ZERNIO;
  }

  // 8. POST sem acao continua sendo o Modo Automático (mesma validação de antes)
  {
    instalarFetch({ resposta: { posts: [] } });
    const res = resFake();
    await handler({ method: 'POST', headers: {}, query: {}, body: { profile: 'xyz' } }, res);
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.corpo.error, 'profile inválido');
  }

  console.log('tema-post: ok');
})().catch((e) => { console.error(e); process.exit(1); });
