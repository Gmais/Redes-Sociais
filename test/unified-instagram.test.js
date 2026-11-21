// Testa a importação das contas do portfólio (usuário do sistema), com Meta e Supabase simulados.
const assert = require('assert');
const crypto = require('crypto');
const analise = require('../lib/analise-api');
const unified = require('../lib/unified-instagram');
const sync = require('../lib/sync-instagram');
const { decifrarToken } = require('../lib/token-vault');

const CHAVE = crypto.randomBytes(32).toString('base64');
const CFG = { url: 'https://projeto.supabase.test', anon: 'a', service: 's' };
const ORG = '22222222-2222-2222-2222-222222222222';
const ADMIN = '11111111-1111-1111-1111-111111111111';
const VIEWER = '33333333-3333-3333-3333-333333333333';
const SUAT = 'token-do-usuario-de-sistema';

const resposta = (status, corpo) => {
  const texto = corpo === undefined || corpo === '' ? '' : typeof corpo === 'string' ? corpo : JSON.stringify(corpo);
  return { ok: status >= 200 && status < 300, status, text: async () => texto, json: async () => JSON.parse(texto || '{}') };
};

function criarFake({ papel = 'admin', falhaMeta = false } = {}) {
  const log = [];
  const contas = [];
  const tokens = [];
  const f = async (url, o = {}) => {
    const metodo = o.method || 'GET';
    const u = new URL(url);
    log.push({ metodo, caminho: u.pathname });
    if (u.pathname === '/auth/v1/user') {
      const t = (o.headers.Authorization || '').replace('Bearer ', '');
      return resposta(200, { id: t === 'tok-viewer' ? VIEWER : ADMIN, email: 'x@x.test' });
    }
    if (u.host === 'graph.facebook.com' && u.pathname === '/v27.0/me/assigned_instagram_accounts') {
      if (falhaMeta) return resposta(400, { error: { message: 'Token expirado' } });
      if (u.searchParams.get('access_token') !== SUAT) return resposta(400, { error: { message: 'token errado' } });
      if (!u.searchParams.get('after')) {
        return resposta(200, { data: [
          { id: '17841400000001', username: 'academia' },
          { id: '17841400000002', username: 'sorveteria' }
        ], paging: { next: `https://graph.facebook.com/v27.0/me/assigned_instagram_accounts?after=p2&access_token=${SUAT}` } });
      }
      return resposta(200, { data: [{ id: '17841400000003', username: 'gympulse' }] });
    }
    if (u.pathname === '/rest/v1/organization_members') {
      return resposta(200, [{ role: papel }]);
    }
    if (u.pathname === '/rest/v1/social_accounts' && metodo === 'POST') {
      const linha = JSON.parse(o.body)[0];
      const achada = { id: crypto.randomUUID(), ...linha };
      contas.push(achada);
      return resposta(201, [achada]);
    }
    if (u.pathname === '/rest/v1/social_tokens' && metodo === 'POST') {
      tokens.push(JSON.parse(o.body));
      return resposta(201, '');
    }
    return resposta(201, '');
  };
  return { f, log, contas, tokens };
}

function chamar(papel, env, extra = {}) {
  const res = { statusCode: 200, body: undefined, status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; return this; } };
  const req = { method: 'POST', query: {}, headers: { authorization: 'Bearer ' + (papel === 'viewer' ? 'tok-viewer' : 'tok-admin') }, on(ev, cb) {
    if (ev === 'data') setImmediate(() => cb(JSON.stringify({ orgId: ORG })));
    if (ev === 'end') setImmediate(() => cb());
    return req;
  } };
  return { req, res, deps: { env, config: CFG, fetch: extra.fetch, agora: () => Date.now() } };
}

(async () => {
  // Host das contas do portfólio: graph.facebook.com (mesmo caminho das contas ligadas a Página)
  assert.strictEqual(sync.hostDaConta({ parent_external_id: unified.MARCADOR_PORTFOLIO }), 'https://graph.facebook.com');

  // Importação completa com paginação
  let fake = criarFake();
  let c = chamar('admin', { INSTAGRAM_SYSTEM_TOKEN: SUAT, TOKEN_ENCRYPTION_KEY: CHAVE }, { fetch: fake.f });
  await analise.HANDLERS['importar-portfolio'](c.req, c.res, c.deps);
  assert.strictEqual(c.res.statusCode, 200);
  assert.strictEqual(c.res.body.contas, 3, 'lê as duas páginas da lista');
  assert.strictEqual(c.res.body.importadas, 3);
  assert.deepStrictEqual(fake.contas.map((x) => x.external_id).sort(), ['17841400000001', '17841400000002', '17841400000003']);
  assert.ok(fake.contas.every((x) => x.parent_external_id === 'portfolio' && x.platform === 'instagram'));
  assert.strictEqual(fake.tokens.length, 3);
  for (const conta of fake.contas) {
    const token = fake.tokens.find((t) => t.social_account_id === conta.id);
    assert.ok(token.access_token_encrypted.startsWith('v1.') && !token.access_token_encrypted.includes(SUAT), 'token cifrado por conta');
    assert.strictEqual(decifrarToken(token.access_token_encrypted, conta.id, CHAVE), SUAT, 'a cópia decifra só na própria conta');
  }

  // Viewer não importa
  fake = criarFake({ papel: 'viewer' });
  c = chamar('viewer', { INSTAGRAM_SYSTEM_TOKEN: SUAT, TOKEN_ENCRYPTION_KEY: CHAVE }, { fetch: fake.f });
  await analise.HANDLERS['importar-portfolio'](c.req, c.res, c.deps);
  assert.strictEqual(c.res.statusCode, 403);
  assert.strictEqual(fake.contas.length, 0);

  // Sem o token do sistema: mensagem clara, nada gravado
  fake = criarFake();
  c = chamar('admin', { TOKEN_ENCRYPTION_KEY: CHAVE }, { fetch: fake.f });
  await analise.HANDLERS['importar-portfolio'](c.req, c.res, c.deps);
  assert.strictEqual(c.res.statusCode, 500);
  assert.match(c.res.body.error, /INSTAGRAM_SYSTEM_TOKEN/);
  assert.strictEqual(fake.contas.length, 0);

  // Erro da Meta: mensagem genérica, sem detalhes do token
  fake = criarFake({ falhaMeta: true });
  c = chamar('admin', { INSTAGRAM_SYSTEM_TOKEN: SUAT, TOKEN_ENCRYPTION_KEY: CHAVE }, { fetch: fake.f });
  await analise.HANDLERS['importar-portfolio'](c.req, c.res, c.deps);
  assert.strictEqual(c.res.statusCode, 500);
  assert.match(c.res.body.error, /Confira o token do sistema/);
  assert.ok(!JSON.stringify(c.res.body).includes(SUAT));

  console.log('ok (unified-instagram)');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
