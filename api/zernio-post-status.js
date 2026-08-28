// Consulta o status real de um post já enviado à Zernio (GET /v1/posts/{id}),
// pra confirmar se ele realmente saiu no Instagram — não é o navegador quem
// decide isso, é a própria Zernio. Usado pelo painel logo depois de uma
// publicação manual, pra dar feedback rápido sem esperar o cron de 5min
// (api/auto-publish.js) rodar de novo. A chave da Zernio nunca chega ao
// navegador; este endpoint fica só como intermediário.

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

    const zRes = await fetch(`${ZERNIO_BASE}/posts/${postId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    const data = await zRes.json();
    if (!zRes.ok) {
      res.status(502).json({ error: 'Falha ao consultar status na Zernio: ' + (data.error || JSON.stringify(data)) });
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
    res.status(500).json({ error: e.message || 'Erro inesperado ao consultar status.' });
  }
};
