// Login do painel nas rotas da Zernio: sem a variável não muda nada; com ela, exige token Supabase válido.
const assert = require('assert');
const { exigirLogin } = require('../lib/zernio-login.js');

const CONFIG = { url: 'https://exemplo.supabase.co', anon: 'anon', service: 'service' };

function resFake() {
  const r = { statusCode: 200, corpo: null };
  r.status = (c) => { r.statusCode = c; return r; };
  r.json = (b) => { r.corpo = b; return r; };
  return r;
}

// Supabase simulado: /auth/v1/user aceita só o token "bom"
function fetchFake(chamadas) {
  return async (url, opts = {}) => {
    chamadas.push({ url, headers: opts.headers });
    const bom = (opts.headers && opts.headers.Authorization) === 'Bearer token-bom';
    const corpo = bom ? { id: '11111111-1111-1111-1111-111111111111', email: 'x@exemplo.com' } : { msg: 'invalid' };
    return { ok: bom, status: bom ? 200 : 401, json: async () => corpo };
  };
}

(async () => {
  // 1. Variável desligada: deixa passar sem consultar nada
  {
    const chamadas = [];
    const res = resFake();
    const ok = await exigirLogin({ headers: {} }, res, { env: {}, config: CONFIG, fetch: fetchFake(chamadas) });
    assert.strictEqual(ok, true);
    assert.strictEqual(chamadas.length, 0, 'com a variável desligada não consulta o Supabase');
  }

  // 2. Ligada, sem token: 401
  {
    const chamadas = [];
    const res = resFake();
    const ok = await exigirLogin({ headers: {} }, res, { env: { EXIGIR_LOGIN_ZERNIO: '1' }, config: CONFIG, fetch: fetchFake(chamadas) });
    assert.strictEqual(ok, false);
    assert.strictEqual(res.statusCode, 401);
    assert.ok(res.corpo.error.includes('Entre no painel'));
  }

  // 3. Ligada, token de outra pessoa/expirado: 401
  {
    const res = resFake();
    const ok = await exigirLogin({ headers: { authorization: 'Bearer token-ruim' } }, res,
      { env: { EXIGIR_LOGIN_ZERNIO: '1' }, config: CONFIG, fetch: fetchFake([]) });
    assert.strictEqual(ok, false);
    assert.strictEqual(res.statusCode, 401);
  }

  // 4. Ligada, token válido: deixa passar
  {
    const res = resFake();
    const ok = await exigirLogin({ headers: { authorization: 'Bearer token-bom' } }, res,
      { env: { EXIGIR_LOGIN_ZERNIO: '1' }, config: CONFIG, fetch: fetchFake([]) });
    assert.strictEqual(ok, true);
    assert.strictEqual(res.corpo, null, 'não responde nada quando deixa passar');
  }

  // 5. Falha na verificação (Supabase fora do ar) fecha por padrão
  {
    const res = resFake();
    const ok = await exigirLogin({ headers: { authorization: 'Bearer token-bom' } }, res,
      { env: { EXIGIR_LOGIN_ZERNIO: '1' }, config: CONFIG, fetch: async () => { throw new Error('rede'); } });
    assert.strictEqual(ok, false);
    assert.strictEqual(res.statusCode, 401);
  }

  console.log('zernio-login: ok');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
