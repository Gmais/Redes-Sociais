// Publica posts no Instagram (Academia e Sorveteria) via Zernio API.
// A ZERNIO_API_KEY fica só aqui no backend — nunca chega ao navegador.

// Não é segredo: são apenas os IDs das contas já conectadas no Zernio.
const ACCOUNT_MAP = {
  academia: '6a3915825f7d1751ab4af026',
  sorveteria: '6a3916335f7d1751ab4afbe3'
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

  const apiKey = process.env.ZERNIO_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'ZERNIO_API_KEY não configurada no Vercel.' });
    return;
  }

  try {
    const raw = await readBody(req);
    const { profile, caption, fileName, mimeType, base64 } = JSON.parse(raw);

    const accountId = ACCOUNT_MAP[profile];
    if (!accountId) {
      res.status(400).json({ error: 'Perfil sem publicação automática configurada: ' + profile });
      return;
    }
    if (!base64 || !fileName || !mimeType) {
      res.status(400).json({ error: 'Imagem ausente no envio.' });
      return;
    }
    // Vercel free/hobby serverless body limit é 4.5MB. Base64 é ~1.37x o
    // tamanho real, então cortamos antes de tentar e estourar lá na frente.
    if (base64.length > 6_000_000) {
      res.status(413).json({ error: 'Imagem muito grande para publicar via API. Use uma imagem menor que 4MB.' });
      return;
    }

    const buffer = Buffer.from(base64, 'base64');

    // 1. Pede uma URL pré-assinada pro Zernio guardar a imagem.
    const presignRes = await fetch(`${ZERNIO_BASE}/media/presign`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ fileName, fileType: mimeType })
    });
    const presignData = await presignRes.json();
    if (!presignRes.ok) {
      res.status(502).json({ error: 'Falha ao gerar URL de upload no Zernio: ' + (presignData.error || JSON.stringify(presignData)) });
      return;
    }

    // 2. Sobe o arquivo direto pra URL pré-assinada (sem header de auth).
    const uploadRes = await fetch(presignData.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': mimeType },
      body: buffer
    });
    if (!uploadRes.ok) {
      res.status(502).json({ error: 'Falha ao enviar a imagem para o Zernio (status ' + uploadRes.status + ').' });
      return;
    }

    // 3. Cria o post já publicando imediatamente.
    const postRes = await fetch(`${ZERNIO_BASE}/posts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: caption || '',
        mediaItems: [{ type: 'image', url: presignData.publicUrl }],
        platforms: [{ platform: 'instagram', accountId }],
        publishNow: true
      })
    });
    const postData = await postRes.json();
    if (!postRes.ok) {
      res.status(502).json({ error: 'Zernio recusou a publicação: ' + (postData.error || JSON.stringify(postData)) });
      return;
    }

    res.status(200).json({ ok: true, postId: postData.post ? postData.post._id : postData._id, raw: postData });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Erro inesperado ao publicar.' });
  }
};
