// Disparado periodicamente por um workflow do GitHub Actions (já que o plano
// Hobby do Vercel só permite cron 1x/dia, insuficiente pros horários do dia).
// Lê o estado sincronizado no Supabase (manifest + reviewed + images + published)
// e publica no Instagram qualquer post que esteja 100% pronto e já tenha
// passado do horário agendado.

const PROFILE_CONFIG = {
  academia: { accountId: '6a3915825f7d1751ab4af026', apiKeyEnv: 'ZERNIO_API_KEY' },
  sorveteria: { accountId: '6a3916335f7d1751ab4afbe3', apiKeyEnv: 'ZERNIO_API_KEY' },
  gympulse: { accountId: '6a3920625f7d1751ab4b6fdc', apiKeyEnv: 'ZERNIO_API_KEY_GYMPULSE' }
};

const ZERNIO_BASE = 'https://zernio.com/api/v1';
const SUPABASE_URL = 'https://ndzbfvxnallshfiouszk.supabase.co';
const SUPABASE_KEY = 'sb_publishable_cEA3C8OvJgZfeZmbnfVYJg_3wuW1YAt';

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

// "08h" -> {h:8,m:0} / "11h30" -> {h:11,m:30}
function parseTime(timeStr) {
  const match = /^(\d{1,2})h(\d{2})?$/.exec((timeStr || '').trim());
  if (!match) return null;
  return { h: parseInt(match[1], 10), m: match[2] ? parseInt(match[2], 10) : 0 };
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
  const apiKey = process.env[config.apiKeyEnv];
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

    for (const id of Object.keys(manifest)) {
      const item = manifest[id];
      const img = images[id];
      const isReviewed = !!reviewed[id];
      const hasReadyImage = !!(img && img.status === 'ok' && img.zernioStatus === 'ok' && img.zernioUrl);
      const alreadyPublished = !!(published[id] && published[id].status === 'ok');
      const due = scheduledUtcMs(item.date, item.time);

      if (!isReviewed || !hasReadyImage || alreadyPublished || due === null || nowMs < due) continue;
      if (!PROFILE_CONFIG[item.profile]) continue;

      try {
        const postId = await postToInstagram(item.profile, item.caption, item.format, img.zernioUrl);
        newlyPublished[id] = { status: 'ok', postId, publishedAt: new Date().toISOString(), via: 'auto' };
        results.push({ id, ok: true, postId });
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

    res.status(200).json({ ok: true, checked: Object.keys(manifest).length, published: results });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Erro inesperado no auto-publish.' });
  }
};
