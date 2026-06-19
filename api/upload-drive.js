const crypto = require('crypto');

// Non-secret: Drive folder IDs created under "Redes Sociais"
const FOLDER_MAP = {
  academia: '1xltSXYrcyWBAmJxKMzohjG2uuPSPbkWq',
  sorveteria: '1OOZGQK1XO6XMH5K9VfyVXxk9Hdx3U_oS',
  gympulse: '1fxOPjshpJS10kbUeWKYm8UQmQMnN3Rt7'
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function base64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function getAccessToken() {
  const email = process.env.GOOGLE_SA_EMAIL;
  const rawKey = process.env.GOOGLE_SA_PRIVATE_KEY;
  if (!email || !rawKey) {
    throw new Error('Credenciais da conta de serviço não configuradas (GOOGLE_SA_EMAIL / GOOGLE_SA_PRIVATE_KEY)');
  }
  const key = rawKey.replace(/\\n/g, '\n');
  const now = Math.floor(Date.now() / 1000);

  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: email,
    scope: 'https://www.googleapis.com/auth/drive.file',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };

  const signingInput = base64url(JSON.stringify(header)) + '.' + base64url(JSON.stringify(claim));

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signingInput);
  signer.end();
  const signature = signer.sign(key).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const jwt = signingInput + '.' + signature;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=' + encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer') + '&assertion=' + jwt
  });
  const tokenData = await tokenRes.json();
  if (!tokenRes.ok) {
    throw new Error('Falha ao obter token: ' + (tokenData.error_description || tokenData.error || JSON.stringify(tokenData)));
  }
  return tokenData.access_token;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido' });
    return;
  }

  try {
    const raw = await readBody(req);
    const { profile, itemId, fileName, mimeType, base64 } = JSON.parse(raw);

    const folderId = FOLDER_MAP[profile];
    if (!folderId) {
      res.status(400).json({ error: 'Perfil inválido: ' + profile });
      return;
    }
    if (!base64 || !fileName || !mimeType || !itemId) {
      res.status(400).json({ error: 'Dados incompletos no envio' });
      return;
    }
    // Guard: base64 payload roughly 1.37x the raw file size. Vercel's default
    // serverless body limit is 4.5MB, so reject early with a clear message
    // instead of letting it fail obscurely upstream.
    if (base64.length > 6_000_000) {
      res.status(413).json({ error: 'Imagem muito grande. Use uma imagem com até ~4MB.' });
      return;
    }

    const accessToken = await getAccessToken();

    const metadata = { name: fileName, parents: [folderId] };
    const boundary = 'painelgilson' + Date.now();
    const delimiter = '\r\n--' + boundary + '\r\n';
    const closeDelim = '\r\n--' + boundary + '--';

    const metaPart = delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata);

    const mediaPartHeader = delimiter +
      'Content-Type: ' + mimeType + '\r\n' +
      'Content-Transfer-Encoding: base64\r\n\r\n';

    const multipartBody = metaPart + mediaPartHeader + base64 + closeDelim;

    const uploadRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink,thumbnailLink',
      {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + accessToken,
          'Content-Type': 'multipart/related; boundary=' + boundary
        },
        body: multipartBody
      }
    );
    const uploadData = await uploadRes.json();
    if (!uploadRes.ok) {
      const msg = uploadData.error ? uploadData.error.message : 'Erro no upload para o Drive';
      res.status(uploadRes.status).json({ error: msg });
      return;
    }

    res.status(200).json(uploadData);
  } catch (e) {
    res.status(500).json({ error: e.message || 'Erro interno no servidor' });
  }
};
