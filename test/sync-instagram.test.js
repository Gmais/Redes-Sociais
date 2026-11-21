// Testa a sincronização de Instagram (Fase 5) com Meta e Supabase simulados. Sem rede.
const assert = require('assert');
const crypto = require('crypto');
const sync = require('../lib/sync-instagram');
const analise = require('../lib/analise-api');
const { cifrarToken, decifrarToken } = require('../lib/token-vault');

const CHAVE = crypto.randomBytes(32).toString('base64');
const CFG = { url: 'https://projeto.supabase.test', anon: 'a', service: 's' };
const ORG = '22222222-2222-2222-2222-222222222222';
const CONTA_ID = '6f1c2a10-0000-4000-8000-0000000000aa';
const AGORA = Date.parse('2026-11-20T15:00:00Z'); // 12:00 em Brasília
const DIA_ALVO = '2026-11-19';
const DIAS = (n) => new Date(AGORA + n * 86400000).toISOString();

const resposta = (status, corpo) => {
  const texto = corpo === undefined || corpo === '' ? '' : typeof corpo === 'string' ? corpo : JSON.stringify(corpo);
  return { ok: status >= 200 && status < 300, status, text: async () => texto, json: async () => JSON.parse(texto || '{}') };
};

function criarFake({ expiraEm = DIAS(60), tokenPlain = 'token-atual', falhaInsights = false } = {}) {
  const log = [];
  const f = async (url, o = {}) => {
    const metodo = o.method || 'GET';
    const u = new URL(url);
    log.push({ metodo, u, corpo: o.body ? JSON.parse(o.body) : null });
    if (u.pathname.endsWith('/refresh_access_token')) return resposta(200, { access_token: 'token-novo', expires_in: 5184000 });
    if (falhaInsights && u.pathname === '/v27.0/555/insights') return resposta(400, { error: { message: 'Permissão insuficiente' } });
    if (u.pathname === '/v27.0/555/insights') return resposta(200, { data: [
      { name: 'reach', total_value: { value: 1200 } },
      { name: 'total_interactions', total_value: { value: 88 } },
      { name: 'profile_links_taps', total_value: { value: 7 } },
      { name: 'likes', total_value: { value: 50 } }
    ] });
    if (u.pathname === '/v27.0/555') return resposta(200, { followers_count: 1500, media_count: 40 });
    if (u.pathname === '/v27.0/555/media') return resposta(200, { data: [
      { id: 'm1', media_type: 'IMAGE', media_product_type: 'FEED', timestamp: '2026-11-18T12:00:00+0000', caption: 'a', permalink: 'p1' },
      { id: 'm2', media_type: 'VIDEO', media_product_type: 'REELS', timestamp: '2026-11-17T12:00:00+0000', caption: 'b', permalink: 'p2' },
      { id: 'm3', media_type: 'CAROUSEL_ALBUM', media_product_type: 'FEED', timestamp: '2026-11-16T12:00:00+0000', caption: 'c', permalink: 'p3' }
    ] });
    if (u.pathname === '/v27.0/m1/insights') return resposta(200, { data: [
      { name: 'reach', values: [{ value: 300 }] },
      { name: 'saved', values: [{ value: 5 }] },
      { name: 'total_interactions', values: [{ value: 22 }] }
    ] });
    if (u.pathname === '/v27.0/m2/insights') return resposta(200, { data: [
      { name: 'views', values: [{ value: 900 }] },
      { name: 'reach', values: [{ value: 700 }] }
    ] });
    if (u.pathname.startsWith('/rest/v1/')) {
      const tabela = u.pathname.replace('/rest/v1/', '');
      if (tabela === 'social_tokens' && metodo === 'GET') {
        return resposta(200, [{ access_token_encrypted: cifrarToken(tokenPlain, CONTA_ID, CHAVE), token_expires_at: expiraEm, scopes: [] }]);
      }
      if (tabela === 'social_posts' && metodo === 'POST') {
        return resposta(201, log.at(-1).corpo.map((p) => ({ id: 'post-' + p.external_id, external_id: p.external_id })));
      }
      return resposta(201, '');
    }
    return resposta(404, {});
  };
  return { f, log };
}

const conta = (extra = {}) => ({ id: CONTA_ID, organization_id: ORG, platform: 'instagram', external_id: '555', parent_external_id: null, username: 'academia', ...extra });
const chamadas = (log, metodo, caminho) => log.filter((x) => x.metodo === metodo && x.u.pathname === caminho);

(async () => {
  // Host: login direto usa graph.instagram.com; conta ligada à Página usa graph.facebook.com.
  assert.strictEqual(sync.hostDaConta(conta()), 'https://graph.instagram.com');
  assert.strictEqual(sync.hostDaConta(conta({ parent_external_id: 'p1' })), 'https://graph.facebook.com');

  // Tipo de conteúdo e métricas por tipo de publicação.
  assert.strictEqual(sync.tipoDeConteudo({ media_type: 'IMAGE', media_product_type: 'FEED' }), 'post');
  assert.strictEqual(sync.tipoDeConteudo({ media_type: 'VIDEO', media_product_type: 'REELS' }), 'reel');
  assert.strictEqual(sync.tipoDeConteudo({ media_type: 'CAROUSEL_ALBUM', media_product_type: 'FEED' }), 'carousel');
  assert.strictEqual(sync.metricasDaMidia({ media_type: 'CAROUSEL_ALBUM' }), null, 'álbum não tem insights');

  // ── Sincronização completa (token com 60 dias) ───────────────────────────────
  let fake = criarFake();
  let r = await sync.sincronizarContaComToken({ conta: conta(), cfg: CFG, f: fake.f, chave: CHAVE, agora: AGORA, origem: 'manual' });
  assert.strictEqual(r.ok, true, 'sincronização deve dar certo');
  assert.strictEqual(r.registros, 6, '1 conta + 3 posts + 2 métricas de post');

  const insightsConta = fake.log.find((x) => x.u.pathname === '/v27.0/555/insights');
  assert.strictEqual(insightsConta.u.searchParams.get('metric_type'), 'total_value');
  assert.strictEqual(insightsConta.u.searchParams.get('period'), 'day');
  const inicio = Number(insightsConta.u.searchParams.get('since'));
  assert.strictEqual(inicio, Date.parse(DIA_ALVO + 'T03:00:00Z') / 1000, 'janela começa à meia-noite de Brasília');
  assert.strictEqual(Number(insightsConta.u.searchParams.get('until')) - inicio, 86400, 'janela de exatamente um dia');

  const linhaConta = chamadas(fake.log, 'POST', '/rest/v1/account_insights')[0].corpo;
  assert.strictEqual(linhaConta.metric_date, DIA_ALVO);
  assert.strictEqual(linhaConta.reach, 1200);
  assert.strictEqual(linhaConta.engagement, 88, 'total_interactions -> engagement');
  assert.strictEqual(linhaConta.website_clicks, 7, 'profile_links_taps -> website_clicks');
  assert.strictEqual(linhaConta.followers_count, 1500);
  assert.strictEqual(linhaConta.profile_views, null, 'views da conta não é visitas ao perfil: não grava');

  const posts = chamadas(fake.log, 'POST', '/rest/v1/social_posts')[0].corpo;
  assert.deepStrictEqual(posts.map((p) => p.content_type), ['post', 'reel', 'carousel']);
  assert.strictEqual(fake.log.some((x) => x.u.pathname === '/v27.0/m3/insights'), false, 'carrossel não consulta insights');

  const metricasPosts = chamadas(fake.log, 'POST', '/rest/v1/post_insights')[0].corpo;
  assert.strictEqual(metricasPosts.length, 2);
  const m1 = metricasPosts.find((x) => x.social_post_id === 'post-m1');
  assert.strictEqual(m1.saves, 5, 'saved -> saves');
  assert.strictEqual(m1.engagement, 22);
  const m2 = metricasPosts.find((x) => x.social_post_id === 'post-m2');
  assert.strictEqual(m2.views, 900);

  const logs = chamadas(fake.log, 'POST', '/rest/v1/synchronization_logs')[0].corpo;
  assert.strictEqual(logs.status, 'ok');
  assert.strictEqual(logs.records_written, 6);
  assert.strictEqual(logs.origin, 'manual');
  assert.ok(chamadas(fake.log, 'PATCH', '/rest/v1/social_accounts').length === 1, 'marca a última sincronização');

  // ── Token vencido: nada é consultado na Meta e a conta fica como expirada ──────
  fake = criarFake({ expiraEm: DIAS(-1) });
  r = await sync.sincronizarContaComToken({ conta: conta(), cfg: CFG, f: fake.f, chave: CHAVE, agora: AGORA, origem: 'cron' });
  assert.strictEqual(r.ok, false);
  assert.match(r.erro, /token expirado/);
  assert.strictEqual(fake.log.some((x) => x.u.host === 'graph.instagram.com' && x.u.pathname.includes('insights')), false);
  const marcadaExpirada = chamadas(fake.log, 'PATCH', '/rest/v1/social_accounts')[0].corpo;
  assert.strictEqual(marcadaExpirada.status, 'expired');

  // ── Renovação: token vence em 5 dias, então é renovado antes de sincronizar ──────
  fake = criarFake({ expiraEm: DIAS(5), tokenPlain: 'token-atual' });
  r = await sync.sincronizarContaComToken({ conta: conta(), cfg: CFG, f: fake.f, chave: CHAVE, agora: AGORA, origem: 'manual' });
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.tokenRenovado, true);
  const gravacaoToken = chamadas(fake.log, 'POST', '/rest/v1/social_tokens')[0].corpo;
  assert.strictEqual(decifrarToken(gravacaoToken.access_token_encrypted, CONTA_ID, CHAVE), 'token-novo');
  const insightsComNovo = fake.log.find((x) => x.u.pathname === '/v27.0/555/insights');
  assert.strictEqual(insightsComNovo.u.searchParams.get('access_token'), 'token-novo', 'usa o token renovado');

  // ── Erro da Meta: fica no log e não derruba o restante ─────────────────────────
  fake = criarFake({ falhaInsights: true });
  r = await sync.sincronizarContaComToken({ conta: conta(), cfg: CFG, f: fake.f, chave: CHAVE, agora: AGORA, origem: 'manual' });
  assert.strictEqual(r.ok, false);
  assert.match(r.erro, /Permissão insuficiente/);
  const logErro = chamadas(fake.log, 'POST', '/rest/v1/synchronization_logs')[0].corpo;
  assert.strictEqual(logErro.status, 'error');
  assert.match(logErro.error_message, /Permissão insuficiente/);

  // Conta sem token guardado
  const semToken = criarFake();
  const semLinha = async (url, o) => (url.includes('social_tokens') && (o?.method || 'GET') === 'GET' ? resposta(200, []) : semToken.f(url, o));
  r = await sync.sincronizarContaComToken({ conta: conta(), cfg: CFG, f: semLinha, chave: CHAVE, agora: AGORA, origem: 'manual' });
  assert.strictEqual(r.ok, false);

  // ── Handler: só admin dispara, e o resultado vem por conta ─────────────────────
  const comPapel = (papel) => {
    const base = criarFake().f;
    return async (url, o) => {
      const u = new URL(url);
      if (u.pathname === '/auth/v1/user') return resposta(200, { id: '11111111-1111-1111-1111-111111111111', email: 'x@x.test' });
      if (u.pathname === '/rest/v1/organization_members') return resposta(200, [{ role: papel }]);
      if (u.pathname === '/rest/v1/social_accounts' && (o?.method || 'GET') === 'GET') {
        return resposta(200, [{ id: CONTA_ID, organization_id: ORG, platform: 'instagram', external_id: '555', parent_external_id: null, username: 'academia', status: 'active' }]);
      }
      return base(url, o);
    };
  };
  const chamar = async (papel) => {
    const res = { statusCode: 200, body: undefined, status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; return this; } };
    const req = { method: 'POST', query: {}, headers: { authorization: 'Bearer t' }, on(ev, cb) {
      if (ev === 'data') setImmediate(() => cb(JSON.stringify({ orgId: ORG })));
      if (ev === 'end') setImmediate(() => cb());
      return req;
    } };
    const deps = { env: { TOKEN_ENCRYPTION_KEY: CHAVE }, config: CFG, fetch: comPapel(papel), agora: () => AGORA };
    await analise.sincronizarOrganizacao(req, res, deps);
    return res;
  };
  let h = await chamar('viewer');
  assert.strictEqual(h.statusCode, 403, 'viewer não sincroniza');
  h = await chamar('admin');
  assert.strictEqual(h.statusCode, 200);
  assert.strictEqual(h.body.resultados.length, 1);
  assert.strictEqual(h.body.resultados[0].ok, true);
  assert.strictEqual(h.body.resultados[0].registros, 6);
  assert.strictEqual(h.body.resultados[0].conta, 'academia');

  console.log('ok (sync-instagram)');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
