const SUPABASE_URL = 'https://ndzbfvxnallshfiouszk.supabase.co';
const SUPABASE_KEY = 'sb_publishable_cEA3C8OvJgZfeZmbnfVYJg_3wuW1YAt';
fetch(`${SUPABASE_URL}/rest/v1/painel_gilson_state?key=eq.gympulse_dynamic_cards`, {
  method: 'DELETE',
  headers: {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`
  }
}).then(r => console.log('Deleted!', r.status)).catch(e => console.error(e));
