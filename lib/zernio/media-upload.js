// Prepara a mídia (imagem ou vídeo) no storage da Zernio para a publicação
// automática não depender do login do Google no navegador. Dois modos:
//
//   mode:'presign'  (padrão do painel) -> devolve { uploadUrl, publicUrl }. O
//                   NAVEGADOR envia o arquivo direto ao storage (PUT), sem passar
//                   por esta função — por isso vídeo de dezenas de MB funciona.
//                   A chave da Zernio continua só aqui no servidor.
//   (sem mode)      caminho antigo: recebe o arquivo em base64 e envia daqui.
//                   Limitado pelo corpo de 4,5 MB do Vercel (~3,3 MB de arquivo),
//                   serve só de reserva para imagens pequenas.

const PROFILE_CONFIG = {
  academia: { apiKeyEnv: 'ZERNIO_API_KEY' },
  sorveteria: { apiKeyEnv: 'ZERNIO_API_KEY' },
  gympulse: { apiKeyEnv: 'ZERNIO_API_KEY_GYMPULSE' }
};

const ZERNIO_BASE = 'https://zernio.com/api/v1';
// O Vercel recusa corpo > 4,5 MB antes de chegar aqui; base64 infla ~33%.
const MAX_LEGACY_BASE64 = 4_200_000;
// Instagram (via Zernio): vídeo MP4/MOV, até 300 MB (Reel/Post) — Story 100 MB.
const ALLOWED_MIME = /^(image\/(jpeg|png|webp|gif)|video\/(mp4|quicktime))$/i;
const MAX_VIDEO_BYTES = 300 * 1024 * 1024;
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

async function zernioPresign(apiKey, fileName, mimeType, size) {
  const payload = { filename: fileName, contentType: mimeType };
  if (Number.isFinite(size) && size > 0) payload.size = Math.round(size);
  const presignRes = await fetch(`${ZERNIO_BASE}/media/presign`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  let presignData = {};
  try { presignData = await presignRes.json(); } catch (e) { /* corpo não-JSON */ }
  if (!presignRes.ok || !presignData.uploadUrl || !presignData.publicUrl) {
    const detail = presignData.error || presignData.message || ('status ' + presignRes.status);
    throw Object.assign(new Error('Falha ao gerar URL de upload no Zernio: ' + (typeof detail === 'string' ? detail : JSON.stringify(detail))), { status: 502 });
  }
  return presignData;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido' });
    return;
  }

  try {
    const raw = await readBody(req);
    const body = JSON.parse(raw);
    const { profile, fileName, mimeType, base64, mode, size } = body;

    const config = PROFILE_CONFIG[profile];
    if (!config) {
      res.status(400).json({ error: 'Perfil sem conta Zernio configurada: ' + profile });
      return;
    }
    const apiKey = process.env[config.apiKeyEnv] || process.env.ZERNIO_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: config.apiKeyEnv + ' não configurada no Vercel.' });
      return;
    }

    if (mode === 'presign') {
      if (!fileName || !mimeType) {
        res.status(400).json({ error: 'Nome ou tipo do arquivo ausente.' });
        return;
      }
      if (!ALLOWED_MIME.test(mimeType)) {
        res.status(400).json({ error: 'Tipo de arquivo não aceito (' + mimeType + '). Use JPG/PNG ou vídeo MP4/MOV.' });
        return;
      }
      const isVideo = /^video\//i.test(mimeType);
      const limit = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
      if (Number(size) > limit) {
        res.status(413).json({ error: (isVideo ? 'Vídeo' : 'Imagem') + ' maior que ' + Math.round(limit / 1048576) + 'MB.' });
        return;
      }
      const presignData = await zernioPresign(apiKey, fileName, mimeType, Number(size));
      res.status(200).json({ ok: true, uploadUrl: presignData.uploadUrl, publicUrl: presignData.publicUrl });
      return;
    }

    // ── Caminho antigo (base64) — só imagens pequenas ──
    if (!base64 || !fileName || !mimeType) {
      res.status(400).json({ error: 'Imagem ausente no envio.' });
      return;
    }
    if (base64.length > MAX_LEGACY_BASE64) {
      res.status(413).json({ error: 'Arquivo grande demais para este caminho. Recarregue o painel e tente de novo.' });
      return;
    }

    const buffer = Buffer.from(base64, 'base64');
    const presignData = await zernioPresign(apiKey, fileName, mimeType, buffer.length);

    const uploadRes = await fetch(presignData.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': mimeType },
      body: buffer
    });
    if (!uploadRes.ok) {
      res.status(502).json({ error: 'Falha ao enviar o arquivo para o Zernio (status ' + uploadRes.status + ').' });
      return;
    }

    res.status(200).json({ ok: true, publicUrl: presignData.publicUrl });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message || 'Erro inesperado no upload.' });
  }
};
