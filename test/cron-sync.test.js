// Testa o cron diário de sincronização (protegido por CRON_SECRET). Sem rede.
const assert = require('assert');
const crypto = require('crypto');
const analise = require('../lib/analise-api');
const { cifrarToken } = require('../lib/token-vault');

const CHAVE = crypto.randomBytes(32).toString('base64');
const SEGREDO = 'segredo-cron-de-teste-0123456789';
const CFG = { url: 'https://projeto.supabase.test', anon: 'a', service: 's' };
const CONTA = '6f1c2a10-0000-4000-8000-0000000000cc';
const AGORA = Date.parse('2026-11-21T11:00:00Z');

const resposta = (status, corpo) => {
  const texto = corpo === undefined || corpo === '' ? '' : JSON.stringify(corpo);
  return { ok: status >= 200 && status < 300, status, text: async () => texto, json: async () => JSON.parse(texto || '{}') };
};

function fake() {
  const log = [];
  const f = async (url, o = {}) => {
    const metodo = o.method || 'GET';
    const u = new URL(url);
    log.push({ metodo, caminho: u.pathname });
    if (u.pathname === '/rest/v1/social_accounts' && metodo === 'GET') {
      return resposta(200, [{ id: CONTA, organization_id: '22222222-2222-2222-2222-222222222222', platform: 'instagram', external_id: '555', parent_external_id: 'portfolio', username: 'academia', status: 'active' }]);
    }
    if (u.pathname === '/rest/v1/social_tokens' && metodo === 'GET') {
      // token já vencido: a sincronização não chama a Meta, só marca a conta como expirada
      return resposta(200, [{ access_token_encrypted: cifrarToken('x', CONTA, CHAVE), token_expires_at: new Date(AGORA - 1000).toISOString(), scopes: [] }]);
    }
    return resposta(204, '');
  };
  return { f, log };
}

function chamar(authorization, env, f) {
  const res = { statusCode: 200, body: undefined, status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; return this; } };
  const req = { method: 'GET', query: {}, headers: authorization === undefined ? {} : { authorization }, on() { return req; } };
  return analise.HANDLERS['sincronizar-cron'](req, res, { env, config: CFG, fetch: f, agora: () => AGORA }).then(() => res);
}

(async () => {
  const env = { CRON_SECRET: SEGREDO, TOKEN_ENCRYPTION_KEY: CHAVE };

  // Sem o segredo configurado na Vercel: erro de configuração, sem tocar em nada
  let s = fake();
  let r = await chamar('Bearer ' + SEGREDO, { TOKEN_ENCRYPTION_KEY: CHAVE }, s.f);
  assert.strictEqual(r.statusCode, 500);
  assert.match(r.body.error, /CRON_SECRET/);
  assert.strictEqual(s.log.length, 0);

  // Sem cabeçalho, ou com segredo errado: 401 e nada acontece
  s = fake();
  r = await chamar(undefined, env, s.f);
  assert.strictEqual(r.statusCode, 401);
  r = await chamar('Bearer errado', env, s.f);
  assert.strictEqual(r.statusCode, 401);
  r = await chamar('Bearer ' + SEGREDO + 'x', env, s.f);
  assert.strictEqual(r.statusCode, 401, 'segredo com sufixo é recusado');
  assert.strictEqual(s.log.length, 0, 'pedido não autorizado não toca no banco');

  // Com o segredo certo: percorre as contas ativas e marca as vencidas
  s = fake();
  r = await chamar('Bearer ' + SEGREDO, env, s.f);
  assert.strictEqual(r.statusCode, 200);
  assert.strictEqual(r.body.contas, 1);
  assert.strictEqual(r.body.resultados[0].ok, false);
  assert.match(r.body.resultados[0].erro, /token expirado/);
  assert.ok(s.log.some((x) => x.metodo === 'PATCH' && x.caminho === '/rest/v1/social_accounts'), 'conta vencida marcada como expirada');

  console.log('ok (cron-sync)');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
