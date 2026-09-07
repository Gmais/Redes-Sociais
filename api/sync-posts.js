export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  const SUPABASE_URL = 'https://ggphrgfgckpsspbsguhp.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdncGhyZ2ZnY2twc3NwYnNndWhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3NzE2NDUsImV4cCI6MjEwNDM0NzY0NX0.t_dF5I6c0wCBqOnJd6ko6Jpu_ZQyQ5ulA8buRYLAMMk';

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