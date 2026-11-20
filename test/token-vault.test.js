// Testa o cofre de tokens da Meta (AES-256-GCM), sem rede.
const assert = require('assert');
const crypto = require('crypto');
const { cifrarToken, decifrarToken } = require('../lib/token-vault');

const CHAVE = crypto.randomBytes(32).toString('base64');
const CONTA = '6f1c2a10-0000-4000-8000-000000000001';
const TOKEN = 'EAAB-token-de-teste-' + 'x'.repeat(40);

// Ida e volta.
const cifrado = cifrarToken(TOKEN, CONTA, CHAVE);
assert.strictEqual(decifrarToken(cifrado, CONTA, CHAVE), TOKEN);

// Formato versionado e sem o token em claro.
assert.ok(cifrado.startsWith('v1.'), 'prefixo de versão');
assert.strictEqual(cifrado.split('.').length, 4);
assert.ok(!cifrado.includes(TOKEN), 'o texto cifrado não pode conter o token em claro');

// IV aleatório: o mesmo token cifrado duas vezes gera textos diferentes.
assert.notStrictEqual(cifrarToken(TOKEN, CONTA, CHAVE), cifrado);

// Token copiado para outra conta não decifra (AAD = id da conta).
assert.throws(() => decifrarToken(cifrado, '6f1c2a10-0000-4000-8000-000000000002', CHAVE), /falha ao decifrar/);

// Chave errada não decifra.
const outraChave = crypto.randomBytes(32).toString('base64');
assert.throws(() => decifrarToken(cifrado, CONTA, outraChave), /falha ao decifrar/);

// Dado alterado é detectado (GCM autentica o texto).
const partes = cifrado.split('.');
const bytes = Buffer.from(partes[3], 'base64');
bytes[0] ^= 0xff;
const adulterado = [partes[0], partes[1], partes[2], bytes.toString('base64')].join('.');
assert.throws(() => decifrarToken(adulterado, CONTA, CHAVE), /falha ao decifrar/);

// Tag alterada também é detectada.
const tag = Buffer.from(partes[2], 'base64');
tag[0] ^= 0x01;
assert.throws(() => decifrarToken([partes[0], partes[1], tag.toString('base64'), partes[3]].join('.'), CONTA, CHAVE), /falha ao decifrar/);

// Formato inválido.
assert.throws(() => decifrarToken('EAAB-em-texto-puro', CONTA, CHAVE), /formato/);
assert.throws(() => decifrarToken('v2.a.b.c', CONTA, CHAVE), /formato/);

// Configuração: sem chave, chave com tamanho errado, token ou conta vazios.
assert.throws(() => cifrarToken(TOKEN, CONTA, ''), /não configurada/);
assert.throws(() => cifrarToken(TOKEN, CONTA, Buffer.from('curta').toString('base64')), /32 bytes/);
assert.throws(() => cifrarToken('', CONTA, CHAVE), /token vazio/);
assert.throws(() => cifrarToken(TOKEN, '', CHAVE), /id da conta/);

console.log('ok (token-vault)');
