// Sobe uma imagem para o storage do Zernio assim que ela é anexada no card,
// para que a publicação automática (cron) não dependa do login do Google no
// navegador. Retorna a publicUrl que fica salva junto com a imagem.

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
    const { profile, fileName, mimeType, base64 } = JSON.parse(raw);

    const config = PROFILE_CONFIG[profile];
    if (!config) {
      res.status(400).json({ error: 'Perfil sem conta Zernio configurada: ' + profile });
      return;
    }
    const apiKey = process.env[config.apiKeyEnv];
    if (!apiKey) {
      res.status(500).json({ error: config.apiKeyEnv + ' não configurada no Vercel.' });
      return;
    }
    if (!base64 || !fileName || !mimeType) {
      res.status(400).json({ error: 'Imagem ausente no envio.' });
      return;
    }
    if (base64.length > 6_000_000) {
      res.status(413).json({ error: 'Imagem muito grande. Use uma imagem menor que 4MB.' });
      return;
    }

    const buffer = Buffer.from(base64, 'base64');

    const presignRes = await fetch(`${ZERNIO_BASE}/media/presign`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ filename: fileName, contentType: mimeType })
    });
    const presignData = await presignRes.json();
    if (!presignRes.ok) {
      res.status(502).json({ error: 'Falha ao gerar URL de upload no Zernio: ' + (presignData.error || JSON.stringify(presignData)) });
      return;
    }

    const uploadRes = await fetch(presignData.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': mimeType },
      body: buffer
    });
    if (!uploadRes.ok) {
      res.status(502).json({ error: 'Falha ao enviar a imagem para o Zernio (status ' + uploadRes.status + ').' });
      return;
    }

    res.status(200).json({ ok: true, publicUrl: presignData.publicUrl });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Erro inesperado no upload.' });
  }
};
