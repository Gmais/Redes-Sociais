// Tenta republicar um post que a Zernio confirmou como falho, usando o
// endpoint dedicado POST /v1/posts/{id}/retry — reaproveita o MESMO post na
// Zernio em vez de criar um post novo (o que geraria duplicata no Instagram
// se a falha original não fosse real, ou se o post falho for reenviado pelo
// fluxo antigo de "Publicar agora").

const PROFILE_CONFIG = {
  academia: { apiKeyEnv: 'ZERNIO_API_KEY' },
  sorveteria: { apiKeyEnv: 'ZERNIO_API_KEY' },
  gympulse: { apiKeyEnv: 'ZERNIO_API_KEY_GYMPULSE' }
};

const ZERNIO_BASE = 'https://zernio.com/api/v1';

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido' });
    return;
  }

  try {
    const raw = await readBody(req);
    const { profile, postId } = JSON.parse(raw);

    const config = PROFILE_CONFIG[profile];
    if (!config) {
      res.status(400).json({ error: 'Perfil sem publicação automática configurada: ' + profile });
      return;
    }
    if (!postId) {
      res.status(400).json({ error: 'postId ausente.' });
      return;
    }
    const apiKey = process.env[config.apiKeyEnv] || process.env.ZERNIO_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: config.apiKeyEnv + ' não configurada no Vercel.' });
      return;
    }

    const zRes = await fetch(`${ZERNIO_BASE}/posts/${postId}/retry`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    const data = await zRes.json();
    if (!zRes.ok) {
      res.status(zRes.status === 429 ? 429 : 502).json({ error: 'Zernio recusou o retry: ' + (data.error || JSON.stringify(data)) });
      return;
    }

    const post = data.post || data;
    const ig = (post.platforms || []).find(p => p.platform === 'instagram') || null;

    res.status(200).json({
      ok: true,
      postStatus: post.status || null,
      instagram: ig ? {
        status: ig.status || null,
        platformPostUrl: ig.platformPostUrl || null,
        platformPostId: ig.platformPostId || null,
        errorMessage: ig.errorMessage || null,
        errorCategory: ig.errorCategory || null
      } : null
    });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Erro inesperado ao tentar republicar.' });
  }
};
