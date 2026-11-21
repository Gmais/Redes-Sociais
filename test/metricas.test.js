// Testa a leitura de métricas sincronizadas para a Visão geral. Sem rede.
const assert = require('assert');
const metricas = require('../lib/metricas');
const analise = require('../lib/analise-api');

const CFG = { url: 'https://projeto.supabase.test', anon: 'a', service: 's' };
const ORG = '22222222-2222-2222-2222-222222222222';
const A = 'conta-a';
const B = 'conta-b';

const LINHAS = [
  { metric_date: '2026-11-10', social_account_id: A, reach: 80, engagement: 8, website_clicks: 2, followers_count: 990 },
  { metric_date: '2026-11-11', social_account_id: A, reach: 120, engagement: 12, website_clicks: 3, followers_count: 1002 },
  { metric_date: '2026-11-11', social_account_id: B, reach: 50, engagement: 5, website_clicks: 1, followers_count: 500 },
  { metric_date: '2026-11-12', social_account_id: A, reach: 130, engagement: 13, website_clicks: 4, followers_count: 1004 }
];

const resposta = (status, corpo) => {
  const texto = corpo === undefined ? '' : JSON.stringify(corpo);
  return { ok: status >= 200 && status < 300, status, text: async () => texto, json: async () => JSON.parse(texto || '[]') };
};

function fakeF({ papel = 'viewer', contas = [{ id: A }, { id: B }] } = {}) {
  return async (url, o = {}) => {
    const u = new URL(url);
    if (u.pathname === '/auth/v1/user') return resposta(200, { id: '11111111-1111-1111-1111-111111111111' });
    if (u.pathname === '/rest/v1/organization_members') return resposta(200, papel ? [{ role: papel }] : []);
    if (u.pathname === '/rest/v1/account_insights') return resposta(200, LINHAS);
    if (u.pathname === '/rest/v1/social_accounts') return resposta(200, contas);
    return resposta(404, {});
  };
}

(async () => {
  // Período de 2 dias (11 e 12), anterior de 2 dias (9 e 10)
  const r = await metricas.consultarMetricas({ orgId: ORG, ini: '2026-11-11', fim: '2026-11-12', cfg: CFG, f: fakeF() });
  assert.strictEqual(r.dias, 2);
  assert.deepStrictEqual(r.serie.map((d) => d.data), ['2026-11-11', '2026-11-12']);
  // Dia 11: A + B. Dia 12: só A, mas B continua contando com o último valor (500).
  assert.strictEqual(r.serie[0].alcance, 170);
  assert.strictEqual(r.serie[0].seguidores, 1502);
  assert.strictEqual(r.serie[1].alcance, 130);
  assert.strictEqual(r.serie[1].seguidores, 1504, 'seguidores carregam o último valor conhecido da conta sem dado');
  assert.deepStrictEqual(r.totais, { alcance: 300, engajamento: 30, cliques: 8 });
  assert.deepStrictEqual(r.anteriores, { alcance: 80, engajamento: 8, cliques: 2 });
  assert.strictEqual(r.seguidoresFim, 1504);
  assert.strictEqual(r.contas, 2);
  assert.strictEqual(r.contasComDados, 2);

  // Validação do período
  assert.throws(() => metricas.validarPeriodo('2026-11-12', '2026-11-11'), /data inicial/);
  metricas.validarPeriodo('2026-01-01', '2026-12-31'); // 365 dias: válido
  assert.throws(() => metricas.validarPeriodo('2026-01-01', '2027-01-01'), /365/);
  assert.throws(() => metricas.validarPeriodo('11/11/2026', '2026-11-12'), /inválidas/);

  // Handler: viewer lê; quem não é membro é recusado; data futura é limitada a ontem
  const deps = (f) => ({ env: {}, config: CFG, fetch: f, agora: () => Date.parse('2026-11-21T15:00:00Z') });
  const chamar = async (f, query) => {
    const res = { statusCode: 200, body: undefined, status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; return this; } };
    const req = { method: 'GET', query, headers: { authorization: 'Bearer t' }, on() { return req; } };
    await analise.HANDLERS['metricas'](req, res, deps(f));
    return res;
  };
  let h = await chamar(fakeF({ papel: 'viewer' }), { org: ORG, fim: '2026-12-31', dias: '2' });
  assert.strictEqual(h.statusCode, 200);
  assert.strictEqual(h.body.fim, '2026-11-20', 'nunca passa de ontem (último dado sincronizado)');
  h = await chamar(fakeF({ papel: null }), { org: ORG });
  assert.strictEqual(h.statusCode, 403);
  h = await chamar(fakeF(), { org: ORG, ini: '2026-12-01', fim: '2026-11-01' });
  assert.strictEqual(h.statusCode, 400);

  console.log('ok (metricas)');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
