// Disparado periodicamente por um workflow do GitHub Actions (já que o plano
// Hobby do Vercel só permite cron 1x/dia, insuficiente pros horários do dia).
// Lê o estado sincronizado no Supabase (manifest + reviewed + images + published)
// e publica no Instagram qualquer post que esteja 100% pronto e já tenha
// passado do horário agendado.
//
// IMPORTANTE: aceitar a publicação (Zernio retornar 200 com um postId) não
// significa que o post já está no ar — a Zernio processa a publicação de
// forma assíncrona. Por isso todo post recém-enviado entra como status:'sent'
// (não 'ok'). A cada execução deste cron, ANTES de enviar posts novos, o
// script primeiro reconsulta GET /v1/posts/{postId} de tudo que está 'sent'
// e só promove pra status:'ok' (badge azul) quando a própria Zernio confirma
// platforms[].status === 'published' pra Instagram. Se a Zernio confirmar
// falha (status 'failed'/'partial'), vira status:'error' (badge vermelho).
// Esse é o padrão que a própria doc da Zernio recomenda ("fetch via GET
// /v1/posts/{postId} after publish time").

const PROFILE_CONFIG = {
  academia: { accountId: '6a3915825f7d1751ab4af026', apiKeyEnv: 'ZERNIO_API_KEY' },
  sorveteria: { accountId: '6a3916335f7d1751ab4afbe3', apiKeyEnv: 'ZERNIO_API_KEY' },
  gympulse: { accountId: '6a3920625f7d1751ab4b6fdc', apiKeyEnv: 'ZERNIO_API_KEY_GYMPULSE' }
};

const ZERNIO_BASE = 'https://zernio.com/api/v1';
// ~2h de tentativas (24 execuções x 5min) antes de desistir de confirmar e
// marcar como erro pedindo verificação manual.
const MAX_VERIFY_ATTEMPTS = 24;
const SUPABASE_URL = 'https://ggphrgfgckpsspbsguhp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdncGhyZ2ZnY2twc3NwYnNndWhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3NzE2NDUsImV4cCI6MjEwNDM0NzY0NX0.t_dF5I6c0wCBqOnJd6ko6Jpu_ZQyQ5ulA8buRYLAMMk';

function supabaseFetch(path, options = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
}

// "08h" -> {h:8,m:0} / "11h30" -> {h:11,m:30} / "08:00" -> {h:8,m:0} / "17:30" -> {h:17,m:30}
function parseTime(timeStr) {
  const s = (timeStr || '').trim();
  // Formato "08h" ou "18h30"
  let match = /^(\d{1,2})h(\d{2})?$/.exec(s);
  if (match) return { h: parseInt(match[1], 10), m: match[2] ? parseInt(match[2], 10) : 0 };
  // Formato "08:00" ou "17:30"
  match = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (match) return { h: parseInt(match[1], 10), m: parseInt(match[2], 10) };
  return null;
}

// Brasil não tem horário de verão desde 2019: America/Sao_Paulo é UTC-3 fixo.
function scheduledUtcMs(dateStr, timeStr) {
  const t = parseTime(timeStr);
  if (!t) return null;
  const [y, mo, d] = dateStr.split('-').map(Number);
  return Date.UTC(y, mo - 1, d, t.h + 3, t.m);
}

async function postToInstagram(profile, caption, format, mediaUrl) {
  const config = PROFILE_CONFIG[profile];
  const apiKey = process.env[config.apiKeyEnv] || process.env.ZERNIO_API_KEY;
  if (!apiKey) throw new Error(config.apiKeyEnv + ' não configurada');

  const platformTarget = { platform: 'instagram', accountId: config.accountId };
  if ((format || '').toLowerCase() === 'story') {
    platformTarget.platformSpecificData = { contentType: 'story' };
  }

  const res = await fetch(`${ZERNIO_BASE}/posts`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: caption || '',
      mediaItems: [{ type: 'image', url: mediaUrl }],
      platforms: [platformTarget],
      publishNow: true
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || JSON.stringify(data));
  return data.post ? data.post._id : data._id;
}

// GET /v1/posts/{id} — status real do post, com resultado por plataforma
// (platformPostUrl, errorMessage etc). Ver components/schemas/Post no
// openapi da Zernio: post.status = draft|scheduled|publishing|published|
// failed|partial; post.platforms[].status = pending|publishing|published|failed.
async function fetchZernioPost(profile, postId) {
  const config = PROFILE_CONFIG[profile];
  const apiKey = process.env[config.apiKeyEnv] || process.env.ZERNIO_API_KEY;
  if (!apiKey) throw new Error(config.apiKeyEnv + ' não configurada');

  const res = await fetch(`${ZERNIO_BASE}/posts/${postId}`, {
    headers: { 'Authorization': `Bearer ${apiKey}` }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || JSON.stringify(data));
  return data.post || data;
}

function instagramResultOf(zernioPost) {
  const platforms = zernioPost.platforms || [];
  return platforms.find(p => p.platform === 'instagram') || null;
}

module.exports = async (req, res) => {
  const secret = req.headers['x-auto-publish-secret'];
  if (!process.env.AUTO_PUBLISH_SECRET || secret !== process.env.AUTO_PUBLISH_SECRET) {
    res.status(401).json({ error: 'Não autorizado' });
    return;
  }

  try {
    const stateRes = await supabaseFetch('painel_gilson_state?select=key,value');
    if (!stateRes.ok) throw new Error('Falha ao ler estado do Supabase');
    const rows = await stateRes.json();
    const manifest = (rows.find(r => r.key === 'manifest') || {}).value || {};
    const reviewed = (rows.find(r => r.key === 'reviewed') || {}).value || {};
    const images = (rows.find(r => r.key === 'images') || {}).value || {};
    const published = (rows.find(r => r.key === 'published') || {}).value || {};

    const nowMs = Date.now();
    const results = [];
    const newlyPublished = {};
    const skipped = [];

    // ── PASSO 1: reconciliar posts 'sent' (aceitos pela Zernio, ainda não
    // confirmados) contra o status real em GET /v1/posts/{id}. Só isso pode
    // promover um card pra status:'ok' (badge azul).
    for (const id of Object.keys(published)) {
      const pub = published[id];
      if (!pub || pub.status !== 'sent' || !pub.postId) continue;
      const item = manifest[id];
      if (!item || !PROFILE_CONFIG[item.profile]) continue;

      // Agendado pelo painel pra mais tarde: a Zernio publica sozinha no
      // horário. Só começa a confirmar (e a contar tentativas) depois dele.
      if (pub.scheduledFor && Date.parse(pub.scheduledFor) > nowMs) {
        skipped.push({ id, reason: 'agendado na Zernio para ' + pub.scheduledFor });
        continue;
      }

      try {
        const zpost = await fetchZernioPost(item.profile, pub.postId);
        const ig = instagramResultOf(zpost);
        const igStatus = (ig && ig.status || '').toLowerCase();

        if (igStatus === 'published') {
          newlyPublished[id] = {
            ...pub, status: 'ok', confirmedAt: new Date().toISOString(),
            permalink: ig.platformPostUrl || pub.permalink || null,
            platformPostId: ig.platformPostId || pub.platformPostId || null
          };
          results.push({ id, ok: true, verified: true, postId: pub.postId });
        } else if (igStatus === 'failed') {
          newlyPublished[id] = {
            ...pub, status: 'error',
            errorMsg: ig.errorMessage || 'Zernio reportou falha na publicação.',
            errorCategory: ig.errorCategory || null,
            failedAt: new Date().toISOString()
          };
          results.push({ id, ok: false, verified: true, error: ig.errorMessage });
        } else {
          // ainda pending/publishing do lado da Zernio — continua tentando.
          const attempts = (pub.verifyAttempts || 0) + 1;
          if (attempts >= MAX_VERIFY_ATTEMPTS) {
            newlyPublished[id] = {
              ...pub, status: 'error',
              errorMsg: 'Não foi possível confirmar a publicação após ' + attempts + ' tentativas (~2h) — verifique manualmente no Instagram.',
              verifyAttempts: attempts, timedOut: true
            };
            results.push({ id, ok: false, verified: false, timeout: true });
          } else {
            newlyPublished[id] = { ...pub, verifyAttempts: attempts, lastCheckedAt: new Date().toISOString() };
            skipped.push({ id, reason: 'aguardando confirmação da Zernio (tentativa ' + attempts + '/' + MAX_VERIFY_ATTEMPTS + ')' });
          }
        }
      } catch (e) {
        skipped.push({ id, reason: 'erro ao verificar status na Zernio: ' + e.message });
      }
    }

    // ── PASSO 2: publicar posts novos que estão prontos e já passaram do horário.
    for (const id of Object.keys(manifest)) {
      const item = manifest[id];
      const img = images[id];
      const isReviewed = !!reviewed[id];
      const hasReadyImage = !!(img && img.status === 'ok' && img.zernioStatus === 'ok' && img.zernioUrl);
      const currentPub = newlyPublished[id] || published[id];
      // 'sent' também conta como "já em andamento" — sem isso o cron republicaria
      // (post duplicado no Instagram) a cada 5min enquanto a confirmação não chega.
      const alreadySent = !!(currentPub && (currentPub.status === 'ok' || currentPub.status === 'sent'));
      const due = scheduledUtcMs(item.date, item.time);

      // Log detalhado de cada post para debug
      if (!isReviewed) { skipped.push({ id, reason: 'não revisado' }); continue; }
      if (!hasReadyImage) {
        const imgStatus = img ? `status=${img.status}, zernio=${img.zernioStatus}` : 'sem imagem';
        skipped.push({ id, reason: 'imagem não pronta (' + imgStatus + ')' });
        continue;
      }
      if (alreadySent) { skipped.push({ id, reason: currentPub.status === 'ok' ? 'já publicado (confirmado)' : 'já enviado, aguardando confirmação' }); continue; }
      if (due === null) { skipped.push({ id, reason: 'horário inválido: ' + item.time }); continue; }
      if (nowMs < due) {
        const minLeft = Math.round((due - nowMs) / 60000);
        skipped.push({ id, reason: 'agendado para daqui ' + minLeft + 'min (' + item.time + ')' });
        continue;
      }
      if (!PROFILE_CONFIG[item.profile]) { skipped.push({ id, reason: 'perfil desconhecido: ' + item.profile }); continue; }

      try {
        const postId = await postToInstagram(item.profile, item.caption, item.format, img.zernioUrl);
        newlyPublished[id] = { status: 'sent', postId, sentAt: new Date().toISOString(), via: 'auto', verifyAttempts: 0 };
        results.push({ id, ok: true, postId, verified: false });
      } catch (e) {
        newlyPublished[id] = { status: 'error', errorMsg: e.message, lastTriedAt: new Date().toISOString(), via: 'auto' };
        results.push({ id, ok: false, error: e.message });
      }
    }

    if (Object.keys(newlyPublished).length > 0) {
      // Re-lê o 'published' mais recente antes de gravar, pra não sobrescrever
      // algo que o navegador tenha publicado manualmente nesse meio tempo.
      const freshRes = await supabaseFetch('painel_gilson_state?key=eq.published&select=value');
      const freshRows = await freshRes.json();
      const freshPublished = (freshRows[0] && freshRows[0].value) || {};
      const merged = { ...freshPublished, ...newlyPublished };

      await supabaseFetch('painel_gilson_state', {
        method: 'POST',
        headers: { 'Prefer': 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify([{ key: 'published', value: merged, updated_at: new Date().toISOString() }])
      });
    }

    res.status(200).json({
      ok: true,
      checked: Object.keys(manifest).length,
      published: results,
      skipped: skipped,
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Erro inesperado no auto-publish.' });
  }
};
