// Testa os callbacks obrigatórios da Meta (desautorização e exclusão de dados). Sem rede.
const assert = require('assert');
const crypto = require('crypto');
const cbm = require('../lib/meta-callbacks');
const analise = require('../lib/analise-api');

const SEG_META = 'segredo-meta-teste';
const SEG_IG = 'segredo-ig-teste';
const CFG = { url: 'https://projeto.supabase.test', anon: 'a', service: 's' };
const CONTA = '6f1c2a10-0000-4000-8000-0000000000bb';

// Monta um signed_request no formato da Meta: assinatura.payload (base64url, HMAC-SHA256).
function assinar(payload, segredo) {
  const corpo = Buffer.from(JSON.stringify({ algorithm: 'HMAC-SHA256', ...payload }), 'utf8').toString('base64url');
  const assinatura = crypto.createHmac('sha256', segredo).update(corpo).digest('base64url');
  return assinatura + '.' + corpo;
}

const resposta = (status, corpo) => {
  const texto = corpo === undefined || corpo === '' ? '' : typeof corpo === 'string' ? corpo : JSON.stringify(corpo);
  return { ok: status >= 200 && status < 300, status, text: async () => texto, json: async () => JSON.parse(texto || '{}') };
};

function fakeSupabase() {
  const log = [];
  const f = async (url, o = {}) => {
    const metodo = o.method || 'GET';
    const u = new URL(url);
    log.push({ metodo, caminho: u.pathname + u.search });
    if (u.pathname === '/rest/v1/social_accounts' && metodo === 'GET') return resposta(200, [{ id: CONTA }]);
    return resposta(204, '');
  };
  return { f, log };
}

function mockReq(body) {
  const ouvintes = {};
  const req = { method: 'POST', query: {}, headers: {}, on(ev, cb) { ouvintes[ev] = cb; return req; } };
  setImmediate(() => { if (ouvintes.data) ouvintes.data(body); if (ouvintes.end) ouvintes.end(); });
  return req;
}
function mockRes() {
  return { statusCode: 200, body: undefined, status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; return this; } };
}

(async () => {
  // Validação do signed_request
  const valido = assinar({ user_id: '555' }, SEG_META);
  assert.strictEqual(cbm.lerSignedRequest(valido, [SEG_META]).userId, '555');
  assert.strictEqual(cbm.lerSignedRequest(assinar({ user_id: '555' }, SEG_IG), [SEG_META, SEG_IG]).userId, '555', 'aceita o segredo do app do Instagram');
  assert.throws(() => cbm.lerSignedRequest(assinar({ user_id: '555' }, 'outro-segredo'), [SEG_META, SEG_IG]), /assinatura inválida/);
  const [assinaturaOriginal, corpo] = valido.split('.');
  const payloadTrocado = Buffer.from(JSON.stringify({ algorithm: 'HMAC-SHA256', user_id: '999' }), 'utf8').toString('base64url');
  assert.throws(() => cbm.lerSignedRequest(assinaturaOriginal + '.' + payloadTrocado, [SEG_META]), /assinatura inválida/, 'troca de user_id é recusada');
  assert.throws(() => cbm.lerSignedRequest('lixo', [SEG_META]), /inválido/);
  assert.ok(corpo, 'payload presente');

  const env = { META_APP_SECRET: SEG_META, INSTAGRAM_APP_SECRET: SEG_IG, APP_URL: 'https://painel.test' };

  // Desautorização: contas revogadas e tokens apagados
  let sb = fakeSupabase();
  let res = mockRes();
  await analise.HANDLERS['desautorizacao'](mockReq('signed_request=' + encodeURIComponent(valido)), res, { env, config: CFG, fetch: sb.f, agora: () => Date.now() });
  assert.strictEqual(res.statusCode, 200);
  assert.ok(sb.log.some((x) => x.metodo === 'DELETE' && x.caminho.startsWith('/rest/v1/social_tokens')), 'tokens apagados');
  assert.ok(sb.log.some((x) => x.metodo === 'PATCH' && x.caminho.startsWith('/rest/v1/social_accounts')), 'conta marcada como revogada');

  // Exclusão de dados: contas apagadas e resposta com URL e código de confirmação
  sb = fakeSupabase();
  res = mockRes();
  await analise.HANDLERS['exclusao-dados'](mockReq('signed_request=' + encodeURIComponent(assinar({ user_id: '555' }, SEG_IG))), res, { env, config: CFG, fetch: sb.f, agora: () => Date.now() });
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.url, 'https://painel.test/exclusao-de-dados.html');
  assert.ok(res.body.confirmation_code && res.body.confirmation_code.length > 10, 'código de confirmação');
  assert.ok(sb.log.some((x) => x.metodo === 'DELETE' && x.caminho.startsWith('/rest/v1/social_accounts')), 'contas apagadas');

  // Assinatura inválida: 400 e nada é tocado
  sb = fakeSupabase();
  res = mockRes();
  await analise.HANDLERS['exclusao-dados'](mockReq('signed_request=' + encodeURIComponent(assinar({ user_id: '555' }, 'errado'))), res, { env, config: CFG, fetch: sb.f, agora: () => Date.now() });
  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(sb.log.length, 0, 'pedido inválido não toca no banco');

  console.log('ok (meta-callbacks)');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
