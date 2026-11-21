// Sincronização das contas de Instagram (Fase 5): métricas diárias da conta, seguidores,
// publicações recentes e métricas de cada publicação. Grava com a chave de serviço (servidor).
// Endereços, versão (v27.0) e métricas conferidos na documentação da Meta.
//
// Cada parte é independente: se a Meta negar os insights (permissão em análise, por exemplo),
// seguidores e publicações continuam sendo gravados e o aviso fica registrado. Só falha
// quando nada é gravado.
//
// Dois caminhos de conta, pelo campo parent_external_id:
//   - login direto do Instagram (parent null): graph.instagram.com, com o token do Instagram;
//   - conta ligada a Página do Facebook (parent preenchido): graph.facebook.com, com o token da Página.

const { decifrarToken, cifrarToken } = require('./token-vault');
const { rest } = require('./meta-oauth');

const VERSAO = 'v27.0';
const HOST = { instagram: 'https://graph.instagram.com', facebook: 'https://graph.facebook.com' };
const PERMISSOES_IG = ['instagram_business_basic', 'instagram_business_manage_insights'];

// Métricas da conta por dia (metric_type total_value).
const METRICAS_CONTA = 'reach,accounts_engaged,comments,likes,profile_links_taps,replies,reposts,saves,shares,total_interactions,views';
// Métricas de publicação, por tipo de produto. Álbuns (CAROUSEL_ALBUM) não têm insights na API.
const METRICAS_MIDIA = {
  FEED: 'reach,saved,shares,likes,comments,total_interactions,views',
  REELS: 'reach,saved,shares,likes,comments,total_interactions,views',
  STORY: 'reach,shares,total_interactions,views'
};
const RENOVAR_ANTES_MS = 10 * 24 * 3600 * 1000;
const PUBLICACOES_POR_SYNC = 25;

function hostDaConta(conta) {
  return conta.parent_external_id ? HOST.facebook : HOST.instagram;
}

async function chamar(url, f) {
  const r = await f(url);
  const texto = await r.text();
  let dados = {};
  try { dados = texto ? JSON.parse(texto) : {}; } catch (e) { /* corpo não-JSON */ }
  if (!r.ok) {
    throw new Error('Meta recusou (' + r.status + '): ' + ((dados.error && dados.error.message) || dados.error_message || 'sem detalhe'));
  }
  return dados;
}

// Dia de referência em Brasília (UTC-3, sem horário de verão desde 2019).
function diaBR(ms) {
  return new Date(ms - 3 * 3600 * 1000).toISOString().slice(0, 10);
}
// Meia-noite de Brasília de um dia (AAAA-MM-DD), em segundos (Unix).
function inicioDoDiaBR(ds) {
  return Math.floor(Date.parse(ds + 'T03:00:00Z') / 1000);
}

// Valor de uma métrica da resposta (total_value ou values[0]).
function valorDaMetrica(item) {
  if (item.total_value && item.total_value.value !== undefined) return item.total_value.value;
  if (Array.isArray(item.values) && item.values[0]) return item.values[0].value;
  return null;
}
function mapaDeMetricas(dados) {
  const mapa = {};
  (dados.data || []).forEach((item) => { mapa[item.name] = valorDaMetrica(item); });
  return mapa;
}

// Renova o token do Instagram quando ele vence em menos de 10 dias. Páginas não são renovadas aqui.
// Se a renovação falhar, a sincronização para: sem token válido, nada mais pode ser lido.
async function renovarSeNecessario({ conta, tokenAtual, expiraEm, cfg, f, chave, agora }) {
  if (conta.parent_external_id || !expiraEm) return { token: tokenAtual, expiraEm, renovado: false };
  if (Date.parse(expiraEm) - agora > RENOVAR_ANTES_MS) return { token: tokenAtual, expiraEm, renovado: false };
  const q = new URLSearchParams({ grant_type: 'ig_refresh_token', access_token: tokenAtual });
  const d = await chamar(`${HOST.instagram}/refresh_access_token?${q.toString()}`, f);
  if (!d.access_token) throw new Error('a renovação não devolveu o token');
  const novaExpira = new Date(agora + Number(d.expires_in || 0) * 1000).toISOString();
  await rest(cfg, f, 'POST', 'social_tokens?on_conflict=social_account_id', {
    social_account_id: conta.id,
    access_token_encrypted: cifrarToken(d.access_token, conta.id, chave),
    token_expires_at: novaExpira,
    scopes: PERMISSOES_IG
  }, { Prefer: 'resolution=merge-duplicates,return=minimal' });
  return { token: d.access_token, expiraEm: novaExpira, renovado: true };
}

function tipoDeConteudo(m) {
  if (m.media_product_type === 'REELS') return 'reel';
  if (m.media_product_type === 'STORY') return 'story';
  if (m.media_type === 'CAROUSEL_ALBUM') return 'carousel';
  if (m.media_type === 'VIDEO') return 'video';
  if (m.media_type === 'IMAGE') return 'post';
  return 'other';
}

function metricasDaMidia(m) {
  if (m.media_type === 'CAROUSEL_ALBUM') return null;
  return METRICAS_MIDIA[m.media_product_type || 'FEED'] || null;
}

// Sincroniza uma conta. Cada bloco tenta sozinho e os erros viram avisos.
// Retorna { registros, avisos, tokenRenovado }. Lança erro só se nada foi gravado.
async function sincronizarConta({ conta, token, expiraEm, cfg, f, chave, agora, origem }) {
  const ontem = diaBR(agora - 24 * 3600 * 1000);
  const host = hostDaConta(conta);
  const inicio = inicioDoDiaBR(ontem);
  const avisos = [];
  let registros = 0;

  const renovacao = await renovarSeNecessario({ conta, tokenAtual: token, expiraEm, cfg, f, chave, agora });
  const tokenUso = renovacao.token;

  // 1) Métricas da conta do dia anterior, em Brasília.
  let metricas = {};
  try {
    const q = new URLSearchParams({
      metric: METRICAS_CONTA, period: 'day', metric_type: 'total_value',
      since: String(inicio), until: String(inicio + 86400), access_token: tokenUso
    });
    metricas = mapaDeMetricas(await chamar(`${host}/${VERSAO}/${conta.external_id}/insights?${q.toString()}`, f));
  } catch (e) {
    avisos.push('métricas da conta: ' + e.message);
  }

  // 2) Seguidores e total de publicações (snapshot do momento).
  let perfil = {};
  try {
    perfil = await chamar(`${host}/${VERSAO}/${conta.external_id}?${new URLSearchParams({
      fields: 'followers_count,media_count', access_token: tokenUso }).toString()}`, f);
  } catch (e) {
    avisos.push('seguidores: ' + e.message);
  }

  if (Object.keys(metricas).length || perfil.followers_count !== undefined) {
    await rest(cfg, f, 'POST', 'account_insights?on_conflict=social_account_id,metric_date', {
      social_account_id: conta.id,
      organization_id: conta.organization_id,
      metric_date: ontem,
      reach: metricas.reach ?? null,
      engagement: metricas.total_interactions ?? null,
      website_clicks: metricas.profile_links_taps ?? null,
      followers_count: perfil.followers_count ?? null,
      impressions: null,
      profile_views: null,
      follows_gained: null,
      follows_lost: null
    }, { Prefer: 'resolution=merge-duplicates,return=minimal' });
    registros += 1;
  }

  // 3) Publicações recentes e métricas de cada uma.
  let lista = [];
  try {
    const midias = await chamar(`${host}/${VERSAO}/${conta.external_id}/media?${new URLSearchParams({
      fields: 'id,caption,media_type,media_product_type,permalink,thumbnail_url,timestamp',
      limit: String(PUBLICACOES_POR_SYNC), access_token: tokenUso }).toString()}`, f);
    lista = Array.isArray(midias.data) ? midias.data : [];
  } catch (e) {
    avisos.push('publicações: ' + e.message);
  }

  if (lista.length) {
    const agoraIso = new Date(agora).toISOString();
    const posts = await rest(cfg, f, 'POST', 'social_posts?on_conflict=social_account_id,external_id', lista.map((m) => ({
      social_account_id: conta.id,
      organization_id: conta.organization_id,
      external_id: String(m.id),
      content_type: tipoDeConteudo(m),
      media_type: m.media_type || null,
      permalink: m.permalink || null,
      thumbnail_url: m.thumbnail_url || null,
      caption: m.caption || null,
      published_at: m.timestamp,
      synced_at: agoraIso
    })), { Prefer: 'resolution=merge-duplicates,return=representation' });
    registros += lista.length;

    const idPorExterno = {};
    (posts || []).forEach((p) => { idPorExterno[p.external_id] = p.id; });
    const linhasMetricas = [];
    for (const m of lista) {
      const metricaMidia = metricasDaMidia(m);
      const postId = idPorExterno[String(m.id)];
      if (!metricaMidia || !postId) continue;
      try {
        const qm = new URLSearchParams({ metric: metricaMidia, access_token: tokenUso });
        const dm = mapaDeMetricas(await chamar(`${host}/${VERSAO}/${m.id}/insights?${qm.toString()}`, f));
        linhasMetricas.push({
          social_post_id: postId,
          organization_id: conta.organization_id,
          collected_at: agoraIso,
          reach: dm.reach ?? null,
          likes: dm.likes ?? null,
          comments: dm.comments ?? null,
          shares: dm.shares ?? null,
          saves: dm.saved ?? null,
          engagement: dm.total_interactions ?? null,
          views: dm.views ?? null
        });
      } catch (e) {
        avisos.push(`métricas da publicação ${m.id}: ${e.message}`);
      }
    }
    if (linhasMetricas.length) {
      await rest(cfg, f, 'POST', 'post_insights', linhasMetricas, { Prefer: 'return=minimal' });
      registros += linhasMetricas.length;
    }
  }

  if (registros === 0) {
    throw new Error(avisos.join(' | ') || 'nada foi gravado');
  }

  await rest(cfg, f, 'PATCH', `social_accounts?id=eq.${encodeURIComponent(conta.id)}`,
    { last_synced_at: new Date(agora).toISOString() }, { Prefer: 'return=minimal' });
  await rest(cfg, f, 'POST', 'synchronization_logs', {
    organization_id: conta.organization_id, social_account_id: conta.id, job: 'account_insights',
    origin: origem, status: avisos.length ? 'partial' : 'ok', finished_at: new Date(agora).toISOString(),
    records_written: registros,
    error_message: avisos.length ? avisos.join(' | ').slice(0, 480) : null
  }, { Prefer: 'return=minimal' });

  return { registros, avisos, tokenRenovado: renovacao.renovado };
}

// Lê o token guardado (cifrado) e sincroniza. Falha total vira log de erro, sem derrubar outras contas.
async function sincronizarContaComToken({ conta, cfg, f, chave, agora, origem }) {
  const linhas = await rest(cfg, f, 'GET',
    `social_tokens?select=access_token_encrypted,token_expires_at,scopes&social_account_id=eq.${encodeURIComponent(conta.id)}`);
  const t = linhas && linhas[0];
  if (!t) return { ok: false, erro: 'conta sem token guardado' };
  if (t.token_expires_at && Date.parse(t.token_expires_at) <= agora) {
    await rest(cfg, f, 'PATCH', `social_accounts?id=eq.${encodeURIComponent(conta.id)}`, { status: 'expired' }, { Prefer: 'return=minimal' });
    return { ok: false, erro: 'token expirado: conecte a conta de novo' };
  }
  const token = decifrarToken(t.access_token_encrypted, conta.id, chave);
  try {
    const r = await sincronizarConta({ conta, token, expiraEm: t.token_expires_at, cfg, f, chave, agora, origem });
    return { ok: true, registros: r.registros, avisos: r.avisos, tokenRenovado: r.tokenRenovado };
  } catch (e) {
    const msg = String(e.message || e).slice(0, 480);
    await rest(cfg, f, 'POST', 'synchronization_logs', {
      organization_id: conta.organization_id, social_account_id: conta.id, job: 'account_insights',
      origin: origem, status: 'error', finished_at: new Date(agora).toISOString(), records_written: 0, error_message: msg
    }, { Prefer: 'return=minimal' });
    return { ok: false, erro: msg };
  }
}

module.exports = { sincronizarConta, sincronizarContaComToken, hostDaConta, tipoDeConteudo, metricasDaMidia, inicioDoDiaBR, diaBR, METRICAS_CONTA, METRICAS_MIDIA };
