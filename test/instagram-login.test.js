// Testa o login direto do Instagram (sem Página do Facebook) com Meta e Supabase simulados.
// Sem rede e sem chaves reais.
const assert = require('assert');
const crypto = require('crypto');
const meta = require('../lib/meta-oauth');
const ig = require('../lib/instagram-login');
const analise = require('../lib/analise-api');
const { decifrarToken } = require('../lib/token-vault');

const CHAVE = crypto.randomBytes(32).toString('base64');
const ENV = {
  INSTAGRAM_APP_ID: '990602627938098',
  INSTAGRAM_APP_SECRET: 'segredo-ig-de-teste',
  INSTAGRAM_REDIRECT_URI: 'https://painel.exemplo.test/api/analise?acao=ig-callback',
  TOKEN_ENCRYPTION_KEY: CHAVE,
  APP_URL: 'https://painel.exemplo.test'
};
const CFG = { url: 'https://projeto.supabase.test', anon: 'anon', service: 'service' };
const ORG = '22222222-2222-2222-2222-222222222222';
const ADMIN = '11111111-1111-1111-1111-111111111111';
const VIEWER = '33333333-3333-3333-3333-333333333333';
const TOKENS = { 'tok-admin': ADMIN, 'tok-viewer': VIEWER };

const resposta = (status, corpo) => {
  const texto = corpo === undefined ? '' : typeof corpo === 'string' ? corpo : JSON.stringify(corpo);
  return { ok: status >= 200 && status < 300, status, text: async () => texto, json: async () => JSON.parse(texto) };
};

// Mundo simulado. perfilTipo controla o tipo de conta devolvido pela Meta.
function criarMundo({ perfilTipo = 'BUSINESS' } = {}) {
  return {
    perfilTipo,
    membros: [{ organization_id: ORG, user_id: ADMIN, role: 'admin' }, { organization_id: ORG, user_id: VIEWER, role: 'viewer' }],
    social_accounts: [], social_tokens: [], synchronization_logs: [], trocas: []
  };
}

function fetchFalso(mundo) {
  return async (url, opts = {}) => {
    const metodo = opts.method || 'GET';
    const u = new URL(url);
    if (u.pathname === '/auth/v1/user') {
      const token = (opts.headers.Authorization || '').replace('Bearer ', '');
      return TOKENS[token] ? resposta(200, { id: TOKENS[token], email: 'x@x.test' }) : resposta(401, {});
    }
    if (u.host === 'api.instagram.com' && u.pathname === '/oauth/access_token') {
      mundo.trocas.push(String(opts.body));
      if (String(opts.body).includes('code=ruim')) return resposta(400, { error_type: 'OAuthException', error_message: 'Código inválido' });
      return resposta(200, { data: [{ access_token: 'token-curto', user_id: 555, permissions: 'instagram_business_basic' }] });
    }
    if (u.host === 'graph.instagram.com' && u.pathname === '/access_token') {
      if (u.searchParams.get('grant_type') !== 'ig_exchange_token') return resposta(400, {});
      return resposta(200, { access_token: 'token-longo', token_type: 'bearer', expires_in: 5183944 });
    }
    if (u.host === 'graph.instagram.com' && u.pathname === '/v27.0/me') {
      return resposta(200, { user_id: '555', username: 'academia', name: 'Academia Planeta', account_type: mundo.perfilTipo });
    }
    if (u.pathname.startsWith('/rest/v1/')) {
      const tabela = u.pathname.replace('/rest/v1/', '');
      if (tabela === 'organization_members') {
        const usuario = (u.searchParams.get('user_id') || '').replace('eq.', '');
        const achado = mundo.membros.find((m) => m.user_id === usuario);
        return resposta(200, achado ? [{ role: achado.role }] : []);
      }
      if (tabela === 'social_accounts' && metodo === 'POST') {
        const linha = JSON.parse(opts.body)[0];
        const existente = { id: crypto.randomUUID(), ...linha };
        mundo.social_accounts.push(existente);
        return resposta(201, [existente]);
      }
      if (tabela === 'social_tokens' && metodo === 'POST') {
        mundo.social_tokens.push(JSON.parse(opts.body));
        return resposta(201);
      }
      if (tabela === 'synchronization_logs' && metodo === 'POST') {
        mundo.synchronization_logs.push(JSON.parse(opts.body));
        return resposta(201);
      }
    }
    return resposta(404, {});
  };
}

function mockReq({ method = 'GET', query = {}, token = null, body = '' } = {}) {
  const ouvintes = {};
  const req = { method, query, headers: token ? { authorization: 'Bearer ' + token } : {}, on(ev, cb) { ouvintes[ev] = cb; return req; } };
  setImmediate(() => { if (ouvintes.data) ouvintes.data(body); if (ouvintes.end) ouvintes.end(); });
  return req;
}
function mockRes() {
  return {
    statusCode: 200, body: undefined, headers: {},
    status(c) { this.statusCode = c; return this; },
    json(b) { this.body = b; return this; },
    writeHead(c, h) { this.statusCode = c; this.headers = h; return this; },
    end() {}
  };
}
async function rodar(handler, reqOpts, dp) {
  const res = mockRes();
  await handler(mockReq(reqOpts), res, dp);
  return res;
}
const dps = (mundo, env = ENV) => ({ env, config: CFG, fetch: fetchFalso(mundo), agora: () => Date.now() });

(async () => {
  // URL de login
  const estado = meta.criarEstado({ orgId: ORG, userId: ADMIN, chave: CHAVE });
  const url = new URL(ig.urlDeLoginIG({ appId: ENV.INSTAGRAM_APP_ID, redirectUri: ENV.INSTAGRAM_REDIRECT_URI, estado }));
  assert.strictEqual(url.origin + url.pathname, 'https://www.instagram.com/oauth/authorize');
  assert.strictEqual(url.searchParams.get('scope'), 'instagram_business_basic,instagram_business_manage_insights');
  assert.strictEqual(url.searchParams.get('response_type'), 'code');
  assert.strictEqual(url.searchParams.get('state'), estado);
  assert.ok(!ig.PERMISSOES_IG.some((p) => /publish|manage_messages|manage_comments/.test(p)), 'só leitura e insights');

  // A troca remove o sufixo "#_" do código
  const mundoTroca = criarMundo();
  await ig.trocarCodigoIG({ codigo: 'abc123#_', appId: ENV.INSTAGRAM_APP_ID, appSecret: ENV.INSTAGRAM_APP_SECRET, redirectUri: ENV.INSTAGRAM_REDIRECT_URI, f: fetchFalso(mundoTroca) });
  assert.ok(mundoTroca.trocas[0].includes('code=abc123&') || mundoTroca.trocas[0].endsWith('code=abc123'), 'sufixo #_ removido');
  assert.ok(mundoTroca.trocas[0].includes('grant_type=authorization_code'));

  // Iniciar: papel, configuração e URL
  const iniciar = (opts, dp) => rodar(analise.iniciarInstagram, { method: 'POST', body: JSON.stringify({ orgId: ORG }), ...opts }, dp);
  let r = await iniciar({ token: 'tok-viewer' }, dps(criarMundo()));
  assert.strictEqual(r.statusCode, 403, 'viewer não conecta');
  r = await iniciar({ token: 'tok-admin', method: 'GET' }, dps(criarMundo()));
  assert.strictEqual(r.statusCode, 405);
  const semId = { ...ENV }; delete semId.INSTAGRAM_APP_ID;
  r = await iniciar({ token: 'tok-admin' }, dps(criarMundo(), semId));
  assert.strictEqual(r.statusCode, 500);
  assert.match(r.body.error, /INSTAGRAM_APP_ID/);
  r = await iniciar({ token: 'tok-admin' }, dps(criarMundo()));
  assert.strictEqual(r.statusCode, 200);
  assert.ok(r.body.url.startsWith('https://www.instagram.com/oauth/authorize?'));
  const estadoAdmin = new URL(r.body.url).searchParams.get('state');

  // Retorno: sucesso com conta profissional
  const retorno = (query, dp) => rodar(analise.callbackInstagram, { method: 'GET', query }, dp);
  const mundo = criarMundo({ perfilTipo: 'BUSINESS' });
  r = await retorno({ code: 'ok#_', state: estadoAdmin }, dps(mundo));
  assert.strictEqual(r.headers.Location, `${ENV.APP_URL}/?analise=conectada&tipo=ig&contas_ig=1`);
  assert.strictEqual(mundo.social_accounts.length, 1);
  const conta = mundo.social_accounts[0];
  assert.strictEqual(conta.platform, 'instagram');
  assert.strictEqual(conta.external_id, '555');
  assert.strictEqual(conta.parent_external_id, null, 'sem Página do Facebook');
  assert.strictEqual(conta.username, 'academia');
  const token = mundo.social_tokens[0];
  assert.ok(token.access_token_encrypted.startsWith('v1.') && !token.access_token_encrypted.includes('token-longo'), 'token cifrado');
  assert.strictEqual(decifrarToken(token.access_token_encrypted, conta.id, CHAVE), 'token-longo');
  assert.ok(token.token_expires_at && Date.parse(token.token_expires_at) > Date.now() + 50 * 24 * 3600 * 1000, 'validade de ~60 dias');
  assert.deepStrictEqual(token.scopes, ig.PERMISSOES_IG);
  assert.strictEqual(mundo.synchronization_logs[0].origin, 'connect');

  // Conta pessoal é recusada e nada é gravado
  const mundoPessoal = criarMundo({ perfilTipo: 'PERSONAL' });
  r = await retorno({ code: 'ok', state: estadoAdmin }, dps(mundoPessoal));
  assert.strictEqual(r.headers.Location, `${ENV.APP_URL}/?analise=erro&motivo=tipo_conta`);
  assert.strictEqual(mundoPessoal.social_accounts.length, 0);

  // Casos de erro do retorno
  r = await retorno({ error: 'access_denied' }, dps(criarMundo()));
  assert.strictEqual(r.headers.Location, `${ENV.APP_URL}/?analise=erro&motivo=recusado`);
  r = await retorno({ code: 'ruim', state: estadoAdmin }, dps(criarMundo()));
  assert.strictEqual(r.headers.Location, `${ENV.APP_URL}/?analise=erro&motivo=instagram`);
  const estadoViewer = meta.criarEstado({ orgId: ORG, userId: VIEWER, chave: CHAVE });
  r = await retorno({ code: 'ok', state: estadoViewer }, dps(criarMundo()));
  assert.strictEqual(r.headers.Location, `${ENV.APP_URL}/?analise=erro&motivo=sem_permissao`);

  console.log('ok (instagram-login)');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
