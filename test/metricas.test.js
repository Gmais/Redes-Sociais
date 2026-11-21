// Testa a leitura de métricas sincronizadas (Visão geral, público e melhores horários). Sem rede.
const assert = require('assert');
const metricas = require('../lib/metricas');
const analise = require('../lib/analise-api');

const CFG = { url: 'https://projeto.supabase.test', anon: 'a', service: 's' };
const ORG = '22222222-2222-2222-2222-222222222222';
const A = 'conta-a';
const B = 'conta-b';

const LINHAS = [
  { metric_date: '2026-11-10', social_account_id: A, reach: 80, views: 90, engagement: 8, website_clicks: 2, followers_count: 990 },
  { metric_date: '2026-11-11', social_account_id: A, reach: 120, views: 150, engagement: 12, website_clicks: 3, followers_count: 1002 },
  { metric_date: '2026-11-11', social_account_id: B, reach: 50, views: 60, engagement: 5, website_clicks: 1, followers_count: 500 },
  { metric_date: '2026-11-12', social_account_id: A, reach: 130, views: 140, engagement: 13, website_clicks: 4, followers_count: 1004 }
];
const PUBLICO = [
  { snapshot_date: '2026-11-20', dimension: 'age_gender', dimension_key: 'age:18-24', value: 30 },
  { snapshot_date: '2026-11-20', dimension: 'age_gender', dimension_key: 'age:25-34', value: 70 },
  { snapshot_date: '2026-11-20', dimension: 'age_gender', dimension_key: 'gender:F', value: 80 },
  { snapshot_date: '2026-11-20', dimension: 'age_gender', dimension_key: 'gender:M', value: 20 },
  { snapshot_date: '2026-11-20', dimension: 'city', dimension_key: 'Turvo', value: 60 },
  { snapshot_date: '2026-11-20', dimension: 'country', dimension_key: 'BR', value: 100 },
  { snapshot_date: '2026-11-01', dimension: 'age_gender', dimension_key: 'age:13-17', value: 999 }
];

const resposta = (status, corpo) => {
  const texto = corpo === undefined ? '' : JSON.stringify(corpo);
  return { ok: status >= 200 && status < 300, status, text: async () => texto, json: async () => JSON.parse(texto || '[]') };
};

function fakeF({ papel = 'viewer', contas = [{ id: A }, { id: B }], postsComMetricas = 0 } = {}) {
  const posts = Array.from({ length: postsComMetricas }, (_, i) => ({ id: 'p' + i, published_at: '2026-11-18T15:00:00Z' }));
  const insights = posts.map((p) => ({ social_post_id: p.id, engagement: 10, collected_at: '2026-11-19T00:00:00Z' }));
  return async (url) => {
    const u = new URL(url);
    if (u.pathname === '/auth/v1/user') return resposta(200, { id: '11111111-1111-1111-1111-111111111111' });
    if (u.pathname === '/rest/v1/organization_members') return resposta(200, papel ? [{ role: papel }] : []);
    if (u.pathname === '/rest/v1/account_insights') return resposta(200, LINHAS);
    if (u.pathname === '/rest/v1/social_accounts') return resposta(200, contas);
    if (u.pathname === '/rest/v1/audience_insights') return resposta(200, PUBLICO);
    if (u.pathname === '/rest/v1/social_posts') return resposta(200, posts);
    if (u.pathname === '/rest/v1/post_insights') return resposta(200, insights);
    return resposta(404, {});
  };
}

(async () => {
  // Visão geral: período de 2 dias (11 e 12), anterior de 2 dias (9 e 10)
  const r = await metricas.consultarMetricas({ orgId: ORG, ini: '2026-11-11', fim: '2026-11-12', cfg: CFG, f: fakeF() });
  assert.deepStrictEqual(r.serie.map((d) => d.data), ['2026-11-11', '2026-11-12']);
  assert.strictEqual(r.serie[0].alcance, 170);
  assert.strictEqual(r.serie[0].visualizacoes, 210);
  assert.strictEqual(r.serie[0].seguidores, 1502);
  assert.strictEqual(r.serie[1].seguidores, 1504, 'conta sem dado mantém o último valor');
  assert.deepStrictEqual(r.totais, { alcance: 300, visualizacoes: 350, engajamento: 30, cliques: 8 });
  assert.deepStrictEqual(r.anteriores, { alcance: 80, visualizacoes: 90, engajamento: 8, cliques: 2 });
  assert.strictEqual(r.seguidoresFim, 1504);
  assert.strictEqual(r.saldoSeguidores, 2, 'saldo = fim (1504) menos início (1502)');
  assert.strictEqual(r.contas, 2);

  // Público: só o snapshot mais recente (20/11), não o de 01/11
  assert.strictEqual(r.publico.snapshot, '2026-11-20');
  assert.deepStrictEqual(r.publico.idade.map((x) => x.rotulo), ['25-34', '18-24']);
  assert.strictEqual(r.publico.idade[0].pct, 70);
  assert.strictEqual(r.publico.genero[0].rotulo, 'Feminino');
  assert.strictEqual(r.publico.cidades[0].rotulo, 'Turvo');

  // Melhores horários: abaixo do mínimo, não mostra ranking
  assert.strictEqual(r.melhoresHorarios.suficiente, false);
  const comPosts = await metricas.consultarMetricas({ orgId: ORG, ini: '2026-11-11', fim: '2026-11-12', cfg: CFG, f: fakeF({ postsComMetricas: 12 }) });
  assert.strictEqual(comPosts.melhoresHorarios.suficiente, true);
  assert.strictEqual(comPosts.melhoresHorarios.posts, 12);
  assert.strictEqual(comPosts.melhoresHorarios.top[0].dia, 'Qua', '18/11/2026 15h UTC = quarta, 12h em Brasília');
  assert.strictEqual(comPosts.melhoresHorarios.top[0].hora, 12);

  // Sem dados de público: null (a tela mostra o aviso)
  const semPublico = metricas.publicoDe([]);
  assert.strictEqual(semPublico, null);

  // Validação do período
  assert.throws(() => metricas.validarPeriodo('2026-11-12', '2026-11-11'), /data inicial/);
  metricas.validarPeriodo('2026-01-01', '2026-12-31'); // 365 dias: válido
  assert.throws(() => metricas.validarPeriodo('2026-01-01', '2027-01-01'), /365/);
  assert.throws(() => metricas.validarPeriodo('11/11/2026', '2026-11-12'), /inválidas/);

  // Handler: viewer lê; não-membro é recusado; data futura é limitada a ontem
  const deps = (f) => ({ env: {}, config: CFG, fetch: f, agora: () => Date.parse('2026-11-21T15:00:00Z') });
  const chamar = async (f, query) => {
    const res = { statusCode: 200, body: undefined, status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; return this; } };
    const req = { method: 'GET', query, headers: { authorization: 'Bearer t' }, on() { return req; } };
    await analise.HANDLERS['metricas'](req, res, deps(f));
    return res;
  };
  let h = await chamar(fakeF({ papel: 'viewer' }), { org: ORG, fim: '2026-12-31', dias: '2' });
  assert.strictEqual(h.statusCode, 200);
  assert.strictEqual(h.body.fim, '2026-11-20', 'nunca passa de ontem');
  assert.ok(h.body.publico, 'resposta traz o público');
  h = await chamar(fakeF({ papel: null }), { org: ORG });
  assert.strictEqual(h.statusCode, 403);
  h = await chamar(fakeF(), { org: ORG, ini: '2026-12-01', fim: '2026-11-01' });
  assert.strictEqual(h.statusCode, 400);

  console.log('ok (metricas)');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
