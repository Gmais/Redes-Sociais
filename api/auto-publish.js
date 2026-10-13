// Disparado periodicamente por um workflow do GitHub Actions (já que o plano
// Hobby do Vercel só permite cron 1x/dia, insuficiente pros horários do dia).
// Este endpoint NÃO publica nada: quem publica/agenda é o painel (botão
// "Publicar no Instagram", que manda a Zernio publicar agora ou agendar).
// Aqui o cron só CONFIRMA, contra a Zernio, os posts que o painel já enviou.
//
// IMPORTANTE: aceitar a publicação (Zernio retornar 200 com um postId) não
// significa que o post já está no ar — a Zernio processa a publicação de
// forma assíncrona. Por isso todo post enviado entra como status:'sent'
// (não 'ok'). A cada execução deste cron o script reconsulta
// GET /v1/posts/{postId} de tudo que está 'sent' (e, se foi agendado, já
// passou do horário) e só promove pra status:'ok' (badge azul) quando a
// própria Zernio confirma platforms[].status === 'published' pra Instagram.
// Se a Zernio confirmar falha (status 'failed'/'partial'), vira
// status:'error' (badge vermelho). Esse é o padrão que a própria doc da
// Zernio recomenda ("fetch via GET /v1/posts/{postId} after publish time").

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
    const stateRes = await supabaseFetch('painel_gilson_state?key=not.like.brand_*&select=key,value');
    if (!stateRes.ok) throw new Error('Falha ao ler estado do Supabase');
    const rows = await stateRes.json();
    const manifest = (rows.find(r => r.key === 'manifest') || {}).value || {};
    const published = (rows.find(r => r.key === 'published') || {}).value || {};

    const nowMs = Date.now();
    const results = [];
    const newlyPublished = {};
    const skipped = [];

    // Reconciliar posts 'sent' (aceitos pela Zernio, ainda não
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
