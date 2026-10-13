// Confere, na Zernio, se a conta de Instagram de cada marca está conectada e
// pode publicar (GET /v1/accounts/health). Só leitura. As chaves da Zernio
// ficam no backend; aqui sai apenas o status (sem chaves nem tokens).
//
// Uso: abrir /api/zernio-health no navegador.

const PROFILE_CONFIG = {
  academia: { accountId: process.env.ZERNIO_ACCOUNT_ACADEMIA || '6ace80c0a737012bc49cb80c', apiKeyEnv: 'ZERNIO_API_KEY' },
  sorveteria: { accountId: process.env.ZERNIO_ACCOUNT_SORVETERIA || '6a3916335f7d1751ab4afbe3', apiKeyEnv: 'ZERNIO_API_KEY' },
  gympulse: { accountId: process.env.ZERNIO_ACCOUNT_GYMPULSE || '6a3920625f7d1751ab4b6fdc', apiKeyEnv: 'ZERNIO_API_KEY_GYMPULSE' }
};

const ZERNIO_BASE = 'https://zernio.com/api/v1';

async function fetchHealth(apiKey) {
  const r = await fetch(`${ZERNIO_BASE}/accounts/health?platform=instagram`, {
    headers: { 'Authorization': `Bearer ${apiKey}` }
  });
  let data = {};
  try { data = await r.json(); } catch (e) { /* corpo não-JSON */ }
  if (!r.ok) throw new Error((data && data.error) || ('status ' + r.status));
  return data.accounts || [];
}

function brief(a) {
  return {
    accountId: a.accountId, username: a.username || null, status: a.status || null,
    canPost: a.canPost, tokenValid: a.tokenValid, tokenExpiresAt: a.tokenExpiresAt || null,
    needsReconnect: !!a.needsReconnect, issues: a.issues || []
  };
}

module.exports = async (req, res) => {
  const cache = {};   // uma consulta por chave (academia e sorveteria usam a mesma)
  const out = {};
  for (const [profile, cfg] of Object.entries(PROFILE_CONFIG)) {
    const apiKey = process.env[cfg.apiKeyEnv] || process.env.ZERNIO_API_KEY;
    if (!apiKey) { out[profile] = { ok: false, error: cfg.apiKeyEnv + ' não configurada no Vercel.' }; continue; }
    try {
      if (!cache[cfg.apiKeyEnv]) cache[cfg.apiKeyEnv] = await fetchHealth(apiKey);
      const accounts = cache[cfg.apiKeyEnv];
      const mine = accounts.find(a => a.accountId === cfg.accountId);
      if (!mine) {
        out[profile] = {
          ok: false, configuredAccountId: cfg.accountId,
          error: 'O ID configurado não existe entre as contas de Instagram desta chave da Zernio.',
          instagramAccountsNestaChave: accounts.map(brief)
        };
      } else {
        const b = brief(mine);
        out[profile] = { ok: b.canPost !== false && !b.needsReconnect && b.tokenValid !== false, configuredAccountId: cfg.accountId, ...b };
      }
    } catch (e) {
      out[profile] = { ok: false, configuredAccountId: cfg.accountId, error: 'Falha ao consultar a Zernio: ' + e.message };
    }
  }
  res.status(200).json({ checkedAt: new Date().toISOString(), profiles: out });
};
