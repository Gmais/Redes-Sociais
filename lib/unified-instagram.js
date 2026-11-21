// Contas do Instagram atribuídas ao portfólio de negócios (Unified Login / usuário do sistema).
// O token do sistema é ligado ao portfólio, não à pessoa. As contas aparecem porque foram
// compartilhadas com o portfólio (me/assigned_instagram_accounts). O token fica no servidor
// (variável INSTAGRAM_SYSTEM_TOKEN) e uma cópia cifrada é guardada por conta, para a sincronização.
//
// Marcação: parent_external_id = 'portfolio' identifica essas contas. A sincronização usa
// graph.facebook.com para elas, do mesmo jeito que para contas ligadas a Página.

const { rest, gravarConta, gravarToken } = require('./meta-oauth');

const GRAPH = 'https://graph.facebook.com/v27.0';
const MARCADOR_PORTFOLIO = 'portfolio';
const PERMISSOES = ['instagram_basic', 'instagram_manage_insights'];
const MAX_PAGINAS = 10;

async function chamarGraph(url, f) {
  const r = await f(url);
  const texto = await r.text();
  let dados = {};
  try { dados = texto ? JSON.parse(texto) : {}; } catch (e) { /* corpo não-JSON */ }
  if (!r.ok) {
    throw new Error('Meta recusou (' + r.status + '): ' + ((dados.error && dados.error.message) || 'sem detalhe'));
  }
  return dados;
}

// Lista as contas de Instagram compartilhadas com o portfólio do token.
async function listarContasAtribuidas({ token, f }) {
  const contas = [];
  let url = `${GRAPH}/me/assigned_instagram_accounts?` + new URLSearchParams({
    fields: 'id,username', limit: '100', access_token: token
  }).toString();
  for (let i = 0; i < MAX_PAGINAS && url; i++) {
    const d = await chamarGraph(url, f);
    (d.data || []).forEach((c) => contas.push({ id: String(c.id), username: c.username || null }));
    url = d.paging && d.paging.next ? d.paging.next : null;
  }
  return contas;
}

// Importa as contas do portfólio para a organização. Retorna contagens.
async function importarContas({ orgId, userId, token, cfg, f, chave }) {
  const contas = await listarContasAtribuidas({ token, f });
  let gravadas = 0;
  for (const c of contas) {
    const contaId = await gravarConta(cfg, f, {
      organization_id: orgId, platform: 'instagram', external_id: c.id,
      parent_external_id: MARCADOR_PORTFOLIO, username: c.username,
      display_name: c.username, status: 'active', connected_by: userId
    });
    await gravarToken(cfg, f, contaId, token, chave, { scopes: PERMISSOES, expiresAt: null });
    gravadas++;
  }
  await rest(cfg, f, 'POST', 'synchronization_logs', {
    organization_id: orgId, job: 'token_refresh', origin: 'connect', status: 'ok',
    finished_at: new Date().toISOString(), records_written: gravadas
  }, { Prefer: 'return=minimal' });
  return { contas: contas.length, gravadas };
}

module.exports = { MARCADOR_PORTFOLIO, listarContasAtribuidas, importarContas };
