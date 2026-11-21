// Conexão oficial com a Meta (login OAuth): Instagram profissional e Páginas do Facebook.
// Pede só permissões de leitura. Os tokens de página são cifrados (lib/token-vault.js) antes de
// irem para o banco. O token do usuário é usado uma vez e descartado.
//
// Versão da Graph API: v26.0 (changelog da Meta, 29/07/2026). Conferir ao atualizar.

const crypto = require('crypto');
const { cifrarToken } = require('./token-vault');

const VERSAO_GRAPH = 'v27.0';
const GRAPH = `https://graph.facebook.com/${VERSAO_GRAPH}`;
const DIALOGO = `https://www.facebook.com/${VERSAO_GRAPH}/dialog/oauth`;
const PERMISSOES = ['pages_show_list', 'pages_read_engagement', 'instagram_basic', 'instagram_manage_insights'];
const VALIDADE_ESTADO_MS = 10 * 60 * 1000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ── Estado (proteção contra CSRF e contra trocar a organização no retorno) ──────
function chaveDeAssinatura(chave) {
  // Chave derivada, separada da chave que cifra os tokens.
  return crypto.createHmac('sha256', chave).update('meta-oauth-state').digest();
}

function assinar(chave, corpo) {
  return crypto.createHmac('sha256', chaveDeAssinatura(chave)).update(corpo).digest('base64url');
}

function criarEstado({ orgId, userId, chave, agora = Date.now() }) {
  if (!UUID.test(String(orgId)) || !UUID.test(String(userId))) throw new Error('ids inválidos no estado');
  const payload = { o: orgId, u: userId, n: crypto.randomBytes(16).toString('base64url'), e: agora + VALIDADE_ESTADO_MS };
  const corpo = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  return corpo + '.' + assinar(chave, corpo);
}

function lerEstado(estado, { chave, agora = Date.now() }) {
  const partes = String(estado || '').split('.');
  if (partes.length !== 2) throw new Error('estado inválido');
  const [corpo, assinatura] = partes;
  const esperada = Buffer.from(assinar(chave, corpo));
  const recebida = Buffer.from(assinatura);
  if (esperada.length !== recebida.length || !crypto.timingSafeEqual(esperada, recebida)) {
    throw new Error('estado inválido');
  }
  let payload;
  try { payload = JSON.parse(Buffer.from(corpo, 'base64url').toString('utf8')); } catch (e) { throw new Error('estado inválido'); }
  if (!payload || !UUID.test(String(payload.o)) || !UUID.test(String(payload.u))) throw new Error('estado inválido');
  if (agora > payload.e) throw new Error('estado expirado');
  return { orgId: payload.o, userId: payload.u };
}

// ── Login ──────────────────────────────────────────────────────────────────────
// Com configId (Login do Facebook para Empresas), as permissões vêm da configuração criada no app
// e o parâmetro scope não é enviado (a Meta recusa scope junto com config_id).
function urlDeLogin({ appId, redirectUri, estado, configId }) {
  const params = { client_id: appId, redirect_uri: redirectUri, state: estado, response_type: 'code' };
  if (configId) params.config_id = configId;
  else params.scope = PERMISSOES.join(',');
  return `${DIALOGO}?${new URLSearchParams(params).toString()}`;
}

async function chamarGraph(caminho, params, f) {
  const r = await f(`${GRAPH}/${caminho}?${new URLSearchParams(params).toString()}`);
  const texto = await r.text();
  let dados = {};
  try { dados = texto ? JSON.parse(texto) : {}; } catch (e) { /* corpo não-JSON */ }
  if (!r.ok) {
    throw new Error('Meta recusou a requisição: ' + ((dados.error && dados.error.message) || ('status ' + r.status)));
  }
  return dados;
}

// appsecret_proof: prova que a chamada veio do servidor que conhece o segredo do app.
function provaDoSegredo(token, appSecret) {
  return crypto.createHmac('sha256', appSecret).update(token).digest('hex');
}

// Código do login -> token de usuário de longa duração.
async function trocarCodigo({ codigo, appId, appSecret, redirectUri, f }) {
  const curto = await chamarGraph('oauth/access_token', {
    client_id: appId, redirect_uri: redirectUri, client_secret: appSecret, code: codigo
  }, f);
  const longo = await chamarGraph('oauth/access_token', {
    grant_type: 'fb_exchange_token', client_id: appId, client_secret: appSecret,
    fb_exchange_token: curto.access_token
  }, f);
  if (!longo.access_token) throw new Error('Meta não devolveu o token de acesso');
  return longo.access_token;
}

// Páginas do usuário e, para cada uma, a conta de Instagram profissional ligada a ela.
async function listarPaginas({ tokenUsuario, appSecret, f }) {
  const dados = await chamarGraph('me/accounts', {
    fields: 'id,name,access_token,instagram_business_account{id,username,name}',
    limit: '100',
    access_token: tokenUsuario,
    appsecret_proof: provaDoSegredo(tokenUsuario, appSecret)
  }, f);
  return Array.isArray(dados.data) ? dados.data : [];
}

// ── Gravação no Supabase (sempre com a chave de serviço, no servidor) ─────────────
async function rest(cfg, f, metodo, caminho, corpo, cabecalhos = {}) {
  const r = await f(`${cfg.url}/rest/v1/${caminho}`, {
    method: metodo,
    headers: {
      apikey: cfg.service,
      Authorization: `Bearer ${cfg.service}`,
      'Content-Type': 'application/json',
      ...cabecalhos
    },
    body: corpo === undefined ? undefined : JSON.stringify(corpo)
  });
  const texto = await r.text();
  if (!r.ok) throw new Error(`Supabase respondeu ${r.status}`);
  return texto ? JSON.parse(texto) : null;
}

async function gravarConta(cfg, f, linha) {
  const linhas = await rest(cfg, f, 'POST',
    'social_accounts?on_conflict=organization_id,platform,external_id', [linha],
    { Prefer: 'resolution=merge-duplicates,return=representation' });
  if (!linhas || !linhas[0] || !linhas[0].id) throw new Error('conta não foi gravada');
  return linhas[0].id;
}

async function gravarToken(cfg, f, contaId, token, chave, { scopes = PERMISSOES, expiresAt = null } = {}) {
  await rest(cfg, f, 'POST', 'social_tokens?on_conflict=social_account_id', {
    social_account_id: contaId,
    access_token_encrypted: cifrarToken(token, contaId, chave),
    token_expires_at: expiresAt,
    scopes
  }, { Prefer: 'resolution=merge-duplicates,return=minimal' });
}

// Grava as páginas (Facebook) e as contas de Instagram ligadas a elas. Retorna contagens.
async function gravarConexoes({ orgId, userId, paginas, cfg, f, chave }) {
  let facebook = 0, instagram = 0;
  for (const pagina of paginas) {
    if (!pagina || !pagina.id || !pagina.access_token) continue;
    const paginaId = await gravarConta(cfg, f, {
      organization_id: orgId, platform: 'facebook', external_id: String(pagina.id),
      display_name: pagina.name || null, status: 'active', connected_by: userId
    });
    await gravarToken(cfg, f, paginaId, pagina.access_token, chave);
    facebook++;

    const ig = pagina.instagram_business_account;
    if (ig && ig.id) {
      // A Graph API do Instagram é acessada com o token da página à qual a conta está ligada.
      const igId = await gravarConta(cfg, f, {
        organization_id: orgId, platform: 'instagram', external_id: String(ig.id),
        parent_external_id: String(pagina.id), username: ig.username || null,
        display_name: ig.name || null, status: 'active', connected_by: userId
      });
      await gravarToken(cfg, f, igId, pagina.access_token, chave);
      instagram++;
    }
  }
  await rest(cfg, f, 'POST', 'synchronization_logs', {
    organization_id: orgId, job: 'token_refresh', origin: 'connect', status: 'ok',
    finished_at: new Date().toISOString(), records_written: facebook + instagram
  }, { Prefer: 'return=minimal' });
  return { facebook, instagram };
}

async function listarContasDaOrganizacao({ orgId, cfg, f }) {
  return rest(cfg, f, 'GET',
    `social_accounts?select=id,platform,external_id,parent_external_id,username,display_name,status,connected_at,last_synced_at,empresa` +
    `&organization_id=eq.${encodeURIComponent(orgId)}&order=connected_at.desc`);
}

module.exports = {
  VERSAO_GRAPH, PERMISSOES,
  criarEstado, lerEstado, urlDeLogin, trocarCodigo, listarPaginas, provaDoSegredo,
  gravarConexoes, listarContasDaOrganizacao,
  // Usados pelo login direto do Instagram (lib/instagram-login.js).
  rest, gravarConta, gravarToken
};
