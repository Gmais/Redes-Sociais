export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  const SUPABASE_URL = 'https://ndzbfvxnallshfiouszk.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_cEA3C8OvJgZfeZmbnfVYJg_3wuW1YAt';

  const postsNovos = req.body || {};

  try {
    // Read current manifest
    const getResp = await fetch(
      `${SUPABASE_URL}/rest/v1/painel_gilson_state?key=eq.manifest`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      }
    );

    let manifestAtual = {};
    if (getResp.ok) {
      const data = await getResp.json();
      if (data.length > 0 && data[0].value) {
        manifestAtual = typeof data[0].value === 'string' ? JSON.parse(data[0].value) : data[0].value;
      }
    }

    // Merge
    const manifestNovo = { ...manifestAtual, ...postsNovos };

    // Update Supabase
    const updateResp = await fetch(
      `${SUPABASE_URL}/rest/v1/painel_gilson_state?key=eq.manifest`,
      {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ value: manifestNovo })
      }
    );

    if (updateResp.ok) {
      res.status(200).json({ success: true, count: Object.keys(postsNovos).length });
    } else {
      res.status(500).json({ error: await updateResp.text() });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}