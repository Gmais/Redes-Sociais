// Cofre de tokens da Meta: AES-256-GCM no servidor. O banco guarda só o texto cifrado (coluna
// social_tokens.access_token_encrypted), nunca o token em claro.
//
// Chave: TOKEN_ENCRYPTION_KEY, 32 bytes em base64, só nas variáveis do Vercel. Gerar uma:
//   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
// Trocar a chave invalida os tokens guardados: a conta precisa ser reconectada.
//
// Formato: v1.<iv>.<tag>.<texto cifrado>, todos em base64.
// Associated data = id da conta social. Um token copiado para outra linha não decifra.

const crypto = require('crypto');

const VERSAO = 'v1';
const ALGORITMO = 'aes-256-gcm';

function chaveDe(chaveBase64) {
  if (!chaveBase64) throw new Error('TOKEN_ENCRYPTION_KEY não configurada');
  const chave = Buffer.from(String(chaveBase64), 'base64');
  if (chave.length !== 32) throw new Error('TOKEN_ENCRYPTION_KEY precisa ter 32 bytes em base64');
  return chave;
}

function cifrarToken(token, socialAccountId, chaveBase64 = process.env.TOKEN_ENCRYPTION_KEY) {
  if (!token) throw new Error('token vazio');
  if (!socialAccountId) throw new Error('id da conta social obrigatório');
  const chave = chaveDe(chaveBase64);
  const iv = crypto.randomBytes(12);
  const cifra = crypto.createCipheriv(ALGORITMO, chave, iv);
  cifra.setAAD(Buffer.from(String(socialAccountId), 'utf8'));
  const texto = Buffer.concat([cifra.update(String(token), 'utf8'), cifra.final()]);
  const tag = cifra.getAuthTag();
  return [VERSAO, iv.toString('base64'), tag.toString('base64'), texto.toString('base64')].join('.');
}

function decifrarToken(payload, socialAccountId, chaveBase64 = process.env.TOKEN_ENCRYPTION_KEY) {
  const partes = String(payload || '').split('.');
  if (partes.length !== 4 || partes[0] !== VERSAO) throw new Error('formato de token cifrado inválido');
  const chave = chaveDe(chaveBase64);
  try {
    const decifra = crypto.createDecipheriv(ALGORITMO, chave, Buffer.from(partes[1], 'base64'));
    decifra.setAAD(Buffer.from(String(socialAccountId), 'utf8'));
    decifra.setAuthTag(Buffer.from(partes[2], 'base64'));
    return Buffer.concat([decifra.update(Buffer.from(partes[3], 'base64')), decifra.final()]).toString('utf8');
  } catch (e) {
    // Mensagem genérica de propósito: não diz se foi a chave, a conta ou o dado que mudou.
    throw new Error('falha ao decifrar token');
  }
}

module.exports = { cifrarToken, decifrarToken };
