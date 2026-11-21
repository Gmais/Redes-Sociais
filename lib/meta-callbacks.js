// Callbacks obrigatórios da Meta para o app: desautorização e exclusão de dados.
// A Meta envia um "signed_request" (HMAC-SHA256 com o segredo do app) no corpo do POST.
// Só processamos pedidos com assinatura válida.

const crypto = require('crypto');
const { rest } = require('./meta-oauth');

// Lê e valida o signed_request. segredos: lista de segredos aceitos (app de Facebook e app do Instagram).
function lerSignedRequest(signedRequest, segredos) {
  const partes = String(signedRequest || '').split('.');
  if (partes.length !== 2) throw new Error('signed_request inválido');
  const [assinaturaB64, payloadB64] = partes;
  const recebida = Buffer.from(assinaturaB64, 'base64url');
  const aceitos = (segredos || []).filter(Boolean);
  const valido = aceitos.some((segredo) => {
    const esperada = crypto.createHmac('sha256', segredo).update(payloadB64).digest();
    return esperada.length === recebida.length && crypto.timingSafeEqual(esperada, recebida);
  });
  if (!valido) throw new Error('assinatura inválida');
  let payload;
  try { payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')); } catch (e) { throw new Error('payload inválido'); }
  if (!payload || !payload.user_id) throw new Error('payload sem user_id');
  return { userId: String(payload.user_id), payload };
}

// Desautorização: a pessoa removeu o app. Marca as contas como revogadas e apaga os tokens.
async function desautorizar({ userId, cfg, f }) {
  const contas = await rest(cfg, f, 'GET',
    `social_accounts?select=id&platform=eq.instagram&external_id=eq.${encodeURIComponent(userId)}`) || [];
  for (const c of contas) {
    await rest(cfg, f, 'DELETE', `social_tokens?social_account_id=eq.${encodeURIComponent(c.id)}`, undefined, { Prefer: 'return=minimal' });
    await rest(cfg, f, 'PATCH', `social_accounts?id=eq.${encodeURIComponent(c.id)}`, { status: 'revoked' }, { Prefer: 'return=minimal' });
  }
  return { contas: contas.length };
}

// Exclusão de dados: apaga as contas dessa pessoa na Meta. Tokens, publicações e métricas caem em cascata.
async function excluirDados({ userId, cfg, f }) {
  const contas = await rest(cfg, f, 'GET',
    `social_accounts?select=id&platform=eq.instagram&external_id=eq.${encodeURIComponent(userId)}`) || [];
  if (contas.length) {
    await rest(cfg, f, 'DELETE', `social_accounts?platform=eq.instagram&external_id=eq.${encodeURIComponent(userId)}`, undefined, { Prefer: 'return=minimal' });
  }
  return { contas: contas.length };
}

module.exports = { lerSignedRequest, desautorizar, excluirDados };
