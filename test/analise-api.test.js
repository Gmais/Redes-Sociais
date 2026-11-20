// Testa o fluxo da conexão com a Meta (login, retorno, gravação e listagem) com Meta e Supabase
// simulados. Sem rede e sem chaves reais.
const assert = require('assert');
const crypto = require('crypto');
const meta = require('../lib/meta-oauth');
const analise = require('../lib/analise-api');
const { decifrarToken } = require('../lib/token-vault');

const CHAVE = crypto.randomBytes(32).toString('base64');
const SEGREDO = 'segredo-do-app-de-teste';
const ENV = {
  META_APP_ID: '123456789',
  META_APP_SECRET: SEGREDO,
  META_REDIRECT_URI: 'https://painel.exemplo.test/api/analise?acao=meta-callback',
  TOKEN_ENCRYPTION_KEY: CHAVE,
  APP_URL: 'https://painel.exemplo.test'
};
const CFG = { url: 'https://projeto.supabase.test', anon: 'anon-publica', service: 'service-secreta' };
const ORG = '22222222-2222-2222-2222-222222222222';
const ADMIN = '11111111-1111-1111-1111-111111111111';
const VIEWER = '33333333-3333-3333-3333-333333333333';
const SEM_VINCULO = '44444444-4444-4444-4444-444444444444';
const TOKENS = { 'tok-admin': ADMIN, 'tok-viewer': VIEWER, 'tok-sem': SEM_VINCULO };

// Estado do "banco" simulado.
function criarMundo() {
  return {
    membros: [
      { organization_id: ORG, user_id: ADMIN, role: 'admin' },
      { organization_id: ORG, user_id: VIEWER, role: 'viewer' }
    ],
    social_accounts: [],
    social_tokens: [],
    synchronization_logs: [],
    chamadasGraph: []
  };
}

// Igual à Response do fetch: text() e json().
const resposta = (status, corpo) => {
  const texto = corpo === undefined ? '' : typeof corpo === 'string' ? corpo : JSON.stringify(corpo);
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => texto,
    json: async () => JSON.parse(texto)
  };
};

function fetchFalso(mundo) {
  return async (url, opts = {}) => {
    const metodo = opts.method || 'GET';
    const u = new URL(url);

    // Autenticação do Supabase.
    if (u.pathname === '/auth/v1/user') {
      const token = (opts.headers.Authorization || '').replace('Bearer ', '');
      if (!TOKENS[token]) return resposta(401, { message: 'invalid token' });
      return resposta(200, { id: TOKENS[token], email: 'x@x.test' });
    }

    // Meta: troca de código e páginas.
    if (u.host === 'graph.facebook.com') {
      mundo.chamadasGraph.push(u.pathname + u.search);
      if (u.pathname.endsWith('/oauth/access_token')) {
        if (u.searchParams.get('code') === 'ruim') return resposta(400, { error: { message: 'Código inválido' } });
        if (u.searchParams.get('grant_type') === 'fb_exchange_token') return resposta(200, { access_token: 'token-longo' });
        return resposta(200, { access_token: 'token-curto' });
      }
      if (u.pathname.endsWith('/me/accounts')) {
        const proof = u.searchParams.get('appsecret_proof');
        if (proof !== meta.provaDoSegredo('token-longo', SEGREDO)) return resposta(400, { error: { message: 'prova inválida' } });
        return resposta(200, {
          data: [
            { id: 'p1', name: 'Academia', access_token: 'PAG-1', instagram_business_account: { id: 'ig1', username: 'academia', name: 'Academia' } },
            { id: 'p2', name: 'Sorveteria', access_token: 'PAG-2' }
          ]
        });
      }
      return resposta(404, { error: { message: 'rota desconhecida' } });
    }

    // PostgREST do Supabase.
    if (u.pathname.startsWith('/rest/v1/')) {
      const tabela = u.pathname.replace('/rest/v1/', '');
      const orgFiltro = (u.searchParams.get('organization_id') || '').replace('eq.', '');
      if (tabela === 'organization_members') {
        const usuario = (u.searchParams.get('user_id') || '').replace('eq.', '');
        const achado = mundo.membros.find((m) => m.organization_id === orgFiltro && m.user_id === usuario);
        return resposta(200, achado ? [{ role: achado.role }] : []);
      }
      if (tabela === 'social_accounts' && metodo === 'GET') {
        return resposta(200, mundo.social_accounts.filter((c) => c.organization_id === orgFiltro));
      }
      if (tabela === 'social_accounts' && metodo === 'POST') {
        const linha = JSON.parse(opts.body)[0];
        let existente = mundo.social_accounts.find((c) =>
          c.organization_id === linha.organization_id && c.platform === linha.platform && c.external_id === linha.external_id);
        if (!existente) {
          existente = { id: crypto.randomUUID(), connected_at: new Date().toISOString(), ...linha };
          mundo.social_accounts.push(existente);
        } else {
          Object.assign(existente, linha);
        }
        return resposta(201, [existente]);
      }
      if (tabela === 'social_tokens' && metodo === 'POST') {
        const linha = JSON.parse(opts.body);
        mundo.social_tokens = mundo.social_tokens.filter((t) => t.social_account_id !== linha.social_account_id);
        mundo.social_tokens.push(linha);
        return resposta(201);
      }
      if (tabela === 'synchronization_logs' && metodo === 'POST') {
        mundo.synchronization_logs.push(JSON.parse(opts.body));
        return resposta(201);
      }
      return resposta(404, { message: 'tabela desconhecida ' + tabela });
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
    statusCode: 200, body: undefined, headers: {}, redirecionado: false,
    status(c) { this.statusCode = c; return this; },
    json(b) { this.body = b; return this; },
    writeHead(c, h) { this.statusCode = c; this.headers = h; return this; },
    end() { this.redirecionado = true; }
  };
}

function deps(mundo, env = ENV, agora = Date.now()) {
  return { env, config: CFG, fetch: fetchFalso(mundo), agora: () => agora };
}

async function rodar(handler, reqOpts, dp) {
  const res = mockRes();
  await handler(mockReq(reqOpts), res, dp);
  return res;
}

(async () => {
  // ── Estado assinado ───────────────────────────────────────────────────────────
  const estado = meta.criarEstado({ orgId: ORG, userId: ADMIN, chave: CHAVE });
  assert.deepStrictEqual(meta.lerEstado(estado, { chave: CHAVE }), { orgId: ORG, userId: ADMIN });
  const adulterado = estado.replace(/^[^.]+/, Buffer.from(JSON.stringify({ o: ORG.replace(/2/g, '9'), u: ADMIN, n: 'x', e: Date.now() + 1e6 })).toString('base64url'));
  assert.throws(() => meta.lerEstado(adulterado, { chave: CHAVE }), /estado inválido/);
  assert.throws(() => meta.lerEstado(estado, { chave: crypto.randomBytes(32).toString('base64') }), /estado inválido/);
  assert.throws(() => meta.lerEstado(estado, { chave: CHAVE, agora: Date.now() + 11 * 60 * 1000 }), /estado expirado/);
  assert.throws(() => meta.lerEstado('sem-ponto', { chave: CHAVE }), /estado inválido/);

  // ── URL de login ──────────────────────────────────────────────────────────────
  const url = new URL(meta.urlDeLogin({ appId: '123', redirectUri: ENV.META_REDIRECT_URI, estado }));
  assert.strictEqual(url.origin + url.pathname, `https://www.facebook.com/${meta.VERSAO_GRAPH}/dialog/oauth`);
  assert.strictEqual(url.searchParams.get('client_id'), '123');
  assert.strictEqual(url.searchParams.get('state'), estado);
  assert.strictEqual(url.searchParams.get('scope').split(',').sort().join(','), [...meta.PERMISSOES].sort().join(','));
  // Com configuração do Login do Facebook para Empresas: config_id no lugar de scope.
  const urlCfg = new URL(meta.urlDeLogin({ appId: '123', redirectUri: ENV.META_REDIRECT_URI, estado, configId: '987' }));
  assert.strictEqual(urlCfg.searchParams.get('config_id'), '987');
  assert.strictEqual(urlCfg.searchParams.get('scope'), null, 'scope não vai junto com config_id');
  assert.ok(!meta.PERMISSOES.some((p) => /publish|manage_posts|delete|write/.test(p)), 'só permissões de leitura');

  // ── Iniciar conexão ───────────────────────────────────────────────────────────
  const iniciar = (opts, dp) => rodar(analise.iniciarMeta, { method: 'POST', body: JSON.stringify({ orgId: ORG }), ...opts }, dp);
  let r = await iniciar({ token: null }, deps(criarMundo()));
  assert.strictEqual(r.statusCode, 401);
  r = await iniciar({ token: 'tok-viewer' }, deps(criarMundo()));
  assert.strictEqual(r.statusCode, 403, 'viewer não conecta conta');
  r = await iniciar({ token: 'tok-sem' }, deps(criarMundo()));
  assert.strictEqual(r.statusCode, 403, 'quem não é membro não conecta conta');
  r = await iniciar({ token: 'tok-admin', method: 'GET' }, deps(criarMundo()));
  assert.strictEqual(r.statusCode, 405);
  const semConfig = { ...ENV }; delete semConfig.META_APP_ID;
  r = await iniciar({ token: 'tok-admin' }, deps(criarMundo(), semConfig));
  assert.strictEqual(r.statusCode, 500);
  assert.match(r.body.error, /META_APP_ID/);
  r = await iniciar({ token: 'tok-admin' }, deps(criarMundo()));
  assert.strictEqual(r.statusCode, 200);
  const urlAdmin = new URL(r.body.url);
  const estadoAdmin = urlAdmin.searchParams.get('state');
  assert.strictEqual(meta.lerEstado(estadoAdmin, { chave: CHAVE }).orgId, ORG);

  // ── Retorno da Meta ───────────────────────────────────────────────────────────
  const retorno = (query, dp) => rodar(analise.callbackMeta, { method: 'GET', query }, dp);
  r = await retorno({ error: 'access_denied' }, deps(criarMundo()));
  assert.strictEqual(r.statusCode, 302);
  assert.strictEqual(r.headers.Location, `${ENV.APP_URL}/?analise=erro&motivo=recusado`);

  r = await retorno({ code: 'x', state: 'lixo' }, deps(criarMundo()));
  assert.strictEqual(r.headers.Location, `${ENV.APP_URL}/?analise=erro&motivo=estado`);

  const estadoViewer = meta.criarEstado({ orgId: ORG, userId: VIEWER, chave: CHAVE });
  r = await retorno({ code: 'ok', state: estadoViewer }, deps(criarMundo()));
  assert.strictEqual(r.headers.Location, `${ENV.APP_URL}/?analise=erro&motivo=sem_permissao`, 'viewer não completa a conexão');

  r = await retorno({ code: 'ruim', state: estadoAdmin }, deps(criarMundo()));
  assert.strictEqual(r.headers.Location, `${ENV.APP_URL}/?analise=erro&motivo=meta`);

  // Caminho feliz: duas páginas, uma com conta de Instagram.
  const mundo = criarMundo();
  r = await retorno({ code: 'ok', state: estadoAdmin }, deps(mundo));
  assert.strictEqual(r.headers.Location, `${ENV.APP_URL}/?analise=conectada&paginas=2&contas_ig=1`);
  assert.strictEqual(mundo.social_accounts.length, 3, '2 páginas + 1 Instagram');
  const pagina1 = mundo.social_accounts.find((c) => c.platform === 'facebook' && c.external_id === 'p1');
  const ig = mundo.social_accounts.find((c) => c.platform === 'instagram');
  assert.strictEqual(ig.parent_external_id, 'p1', 'Instagram ligado à página');
  assert.strictEqual(ig.username, 'academia');
  assert.strictEqual(mundo.social_tokens.length, 3);
  for (const t of mundo.social_tokens) {
    assert.ok(t.access_token_encrypted.startsWith('v1.'), 'token cifrado');
    assert.ok(!t.access_token_encrypted.includes('PAG-'), 'nenhum token em claro no banco');
  }
  const tokenPagina1 = mundo.social_tokens.find((t) => t.social_account_id === pagina1.id);
  assert.strictEqual(decifrarToken(tokenPagina1.access_token_encrypted, pagina1.id, CHAVE), 'PAG-1');
  const tokenIg = mundo.social_tokens.find((t) => t.social_account_id === ig.id);
  assert.strictEqual(decifrarToken(tokenIg.access_token_encrypted, ig.id, CHAVE), 'PAG-1');
  assert.throws(() => decifrarToken(tokenPagina1.access_token_encrypted, ig.id, CHAVE), /falha ao decifrar/,
    'token copiado para outra conta não decifra');
  assert.strictEqual(mundo.synchronization_logs.length, 1);
  assert.strictEqual(mundo.synchronization_logs[0].origin, 'connect');
  assert.ok(!JSON.stringify(mundo.synchronization_logs).includes('PAG-'), 'log sem tokens');

  // Reconectar não duplica contas.
  r = await retorno({ code: 'ok', state: meta.criarEstado({ orgId: ORG, userId: ADMIN, chave: CHAVE }) }, deps(mundo));
  assert.strictEqual(mundo.social_accounts.length, 3, 'reconexão atualiza em vez de duplicar');

  // ── Listagem ──────────────────────────────────────────────────────────────────
  const listar = (opts, dp) => rodar(analise.contasOrganizacao, { method: 'GET', ...opts }, dp);
  r = await listar({ query: {} }, deps(mundo));
  assert.strictEqual(r.statusCode, 401, 'sem login a resposta é 401, antes de olhar a organização');
  r = await listar({ query: {}, token: 'tok-viewer' }, deps(mundo));
  assert.strictEqual(r.statusCode, 400, 'com login, organização inválida é 400');
  r = await listar({ query: { org: ORG }, token: 'tok-sem' }, deps(mundo));
  assert.strictEqual(r.statusCode, 403);
  r = await listar({ query: { org: ORG }, token: 'tok-viewer' }, deps(mundo));
  assert.strictEqual(r.statusCode, 200);
  assert.strictEqual(r.body.accounts.length, 3);
  assert.ok(!JSON.stringify(r.body).includes('access_token'), 'a listagem nunca traz tokens');

  console.log('ok (analise-api)');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
