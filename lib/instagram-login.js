// Login direto do Instagram (Business Login for Instagram): a conta profissional autoriza o painel
// com o próprio login do Instagram. Não precisa de Página do Facebook vinculada.
// Endereços e permissões conferidos na documentação da Meta (Instagram API with Instagram Login).
// Os tokens são cifrados (lib/token-vault.js) antes de irem para o banco.

const { rest, gravarConta, gravarToken } = require('./meta-oauth');

const URL_AUTORIZACAO = 'https://www.instagram.com/oauth/authorize';
const URL_TROCA = 'https://api.instagram.com/oauth/access_token';
const GRAPH_IG = 'https://graph.instagram.com';
const VERSAO_IG = 'v27.0';
const PERMISSOES_IG = ['instagram_business_basic', 'instagram_business_manage_insights'];
const TIPOS_PROFISSIONAIS = ['BUSINESS', 'MEDIA_CREATOR'];

function urlDeLoginIG({ appId, redirectUri, estado }) {
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: PERMISSOES_IG.join(','),
    state: estado
  });
  return `${URL_AUTORIZACAO}?${params.toString()}`;
}

async function lerJson(r) {
  const texto = await r.text();
  let dados = {};
  try { dados = texto ? JSON.parse(texto) : {}; } catch (e) { /* corpo não-JSON */ }
  return { ok: r.ok, status: r.status, dados };
}

// Código do login -> token de curta duração (1 hora). A resposta vem dentro de "data".
async function trocarCodigoIG({ codigo, appId, appSecret, redirectUri, f }) {
  // A Meta devolve o código com "#_" no final; esse sufixo não faz parte do código.
  const code = String(codigo).replace(/#_$/, '');
  const corpo = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
    code
  });
  const r = await f(URL_TROCA, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: corpo.toString()
  });
  const { ok, status, dados } = await lerJson(r);
  if (!ok) {
    throw new Error('Instagram recusou o código: ' + (dados.error_message || dados.error_type || ('status ' + status)));
  }
  const item = Array.isArray(dados.data) ? dados.data[0] : dados;
  if (!item || !item.access_token || !item.user_id) throw new Error('Instagram não devolveu o token');
  return { tokenCurto: item.access_token };
}

// Token de curta duração -> token de longa duração (60 dias).
async function trocarPorLongaIG({ tokenCurto, appSecret, f }) {
  const params = new URLSearchParams({
    grant_type: 'ig_exchange_token',
    client_secret: appSecret,
    access_token: tokenCurto
  });
  const r = await f(`${GRAPH_IG}/access_token?${params.toString()}`);
  const { ok, status, dados } = await lerJson(r);
  if (!ok || !dados.access_token) {
    throw new Error('Instagram não gerou o token de longa duração (status ' + status + ')');
  }
  return { token: dados.access_token, expiresIn: Number(dados.expires_in) || 0 };
}

async function perfilIG({ token, f }) {
  const params = new URLSearchParams({
    fields: 'user_id,username,name,account_type,profile_picture_url',
    access_token: token
  });
  const r = await f(`${GRAPH_IG}/${VERSAO_IG}/me?${params.toString()}`);
  const { ok, status, dados } = await lerJson(r);
  if (!ok) throw new Error('Não foi possível ler a conta (status ' + status + ')');
  return dados;
}

// Só conta profissional (Business ou Criador de conteúdo) entra no painel.
function ehContaProfissional(perfil) {
  return TIPOS_PROFISSIONAIS.includes(String(perfil.account_type || '').toUpperCase());
}

async function gravarContaIG({ orgId, userId, perfil, token, expiresIn, cfg, f, chave, agora }) {
  const contaId = await gravarConta(cfg, f, {
    organization_id: orgId, platform: 'instagram', external_id: String(perfil.user_id),
    parent_external_id: null, username: perfil.username || null,
    display_name: perfil.name || null, status: 'active', connected_by: userId
  });
  const expiraEm = expiresIn ? new Date(agora + expiresIn * 1000).toISOString() : null;
  await gravarToken(cfg, f, contaId, token, chave, { scopes: PERMISSOES_IG, expiresAt: expiraEm });
  await rest(cfg, f, 'POST', 'synchronization_logs', {
    organization_id: orgId, social_account_id: contaId, job: 'token_refresh', origin: 'connect',
    status: 'ok', finished_at: new Date().toISOString(), records_written: 1
  }, { Prefer: 'return=minimal' });
  return contaId;
}

module.exports = {
  PERMISSOES_IG, urlDeLoginIG, trocarCodigoIG, trocarPorLongaIG, perfilIG, ehContaProfissional, gravarContaIG
};
