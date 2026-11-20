// Cancela um post AGENDADO na Zernio (DELETE /v1/posts/{id}) — a Zernio só
// aceita deletar posts que ainda não foram publicados. A chave nunca chega
// ao navegador; este endpoint é só o intermediário.

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
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    // 404 = já não existe na Zernio: para o painel o resultado é o mesmo.
    if (!zRes.ok && zRes.status !== 404) {
      let data = {};
      try { data = await zRes.json(); } catch (e) {}
      res.status(502).json({ error: 'Zernio recusou o cancelamento: ' + (data.error || ('status ' + zRes.status)) });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Erro inesperado ao cancelar o agendamento.' });
  }
};
