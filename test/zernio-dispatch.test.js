// Testa o roteador api/zernio.js com requisições falsas (sem rede e sem chaves reais).
const assert = require('assert');

// As chaves não podem vir do ambiente de quem roda o teste: sem elas, nenhuma chamada sai.
delete process.env.ZERNIO_API_KEY;
delete process.env.ZERNIO_API_KEY_GYMPULSE;

const handler = require('../api/zernio');

function mockReq({ method = 'POST', query = {}, body = '' } = {}) {
  const ouvintes = {};
  const req = { method, query, headers: {}, on(evento, cb) { ouvintes[evento] = cb; return req; } };
  // O corpo chega depois que o handler registrou os ouvintes (como numa requisição real).
  setImmediate(() => {
    if (ouvintes.data) ouvintes.data(body);
    if (ouvintes.end) ouvintes.end();
  });
  return req;
}

function mockRes() {
  return {
    statusCode: 200,
    body: undefined,
    status(c) { this.statusCode = c; return this; },
    json(b) { this.body = b; return this; }
  };
}

async function chamar(opts) {
  const res = mockRes();
  await handler(mockReq(opts), res);
  return res;
}

(async () => {
  // Ação ausente, desconhecida ou que tenta alcançar propriedades do objeto: 404.
  let r = await chamar({ query: {} });
  assert.strictEqual(r.statusCode, 404);
  r = await chamar({ query: { acao: 'nao-existe' } });
  assert.strictEqual(r.statusCode, 404);
  r = await chamar({ query: { acao: 'constructor' } });
  assert.strictEqual(r.statusCode, 404);
  r = await chamar({ query: { acao: '__proto__' } });
  assert.strictEqual(r.statusCode, 404);

  // Cada ação de escrita recusa GET com 405 (mesma regra de antes).
  for (const acao of ['post-status', 'retry-post', 'cancel-post', 'media-upload']) {
    r = await chamar({ method: 'GET', query: { acao } });
    assert.strictEqual(r.statusCode, 405, acao + ' deve recusar GET');
  }

  // Validações que acontecem antes de qualquer chamada à Zernio.
  r = await chamar({ query: { acao: 'post-status' }, body: JSON.stringify({ profile: 'x', postId: '1' }) });
  assert.strictEqual(r.statusCode, 400);
  assert.match(r.body.error, /Perfil sem publicação/);

  r = await chamar({ query: { acao: 'cancel-post' }, body: JSON.stringify({ profile: 'academia' }) });
  assert.strictEqual(r.statusCode, 400);
  assert.match(r.body.error, /postId ausente/);

  r = await chamar({ query: { acao: 'media-upload' }, body: JSON.stringify({ profile: 'x', mode: 'presign' }) });
  assert.strictEqual(r.statusCode, 400);
  assert.match(r.body.error, /Perfil sem conta Zernio/);

  // Chave ausente no Vercel: erro claro (sem chamada de rede).
  r = await chamar({ query: { acao: 'retry-post' }, body: JSON.stringify({ profile: 'academia', postId: '1' }) });
  assert.strictEqual(r.statusCode, 500);
  assert.match(r.body.error, /não configurada/);

  // Tipo de arquivo recusado antes do envio ao storage (com chave definida, sem rede).
  process.env.ZERNIO_API_KEY = 'chave-falsa-do-teste';
  r = await chamar({ query: { acao: 'media-upload' }, body: JSON.stringify({ profile: 'academia', mode: 'presign', fileName: 'a.pdf', mimeType: 'application/pdf', size: 10 }) });
  assert.strictEqual(r.statusCode, 400);
  assert.match(r.body.error, /Tipo de arquivo não aceito/);
  delete process.env.ZERNIO_API_KEY;

  // Health sem chaves: responde 200 com o status de cada perfil, sem sair para a rede.
  r = await chamar({ method: 'GET', query: { acao: 'health' } });
  assert.strictEqual(r.statusCode, 200);
  assert.ok(r.body.checkedAt && r.body.profiles, 'resposta do health');
  assert.strictEqual(r.body.profiles.academia.ok, false);
  assert.match(r.body.profiles.academia.error, /ZERNIO_API_KEY não configurada/);
  assert.match(r.body.profiles.gympulse.error, /ZERNIO_API_KEY_GYMPULSE não configurada/);

  console.log('ok (zernio-dispatch)');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
