// Dispara, pelo cron do Vercel, a exportacao do ranking do dia no Gympulse
// (Edge Function ranking-export-instagran), que monta o ranking e chama
// /api/gympulse-ranking para publicar o Story.
//
// Por que existe: o pg_cron do Gympulse nao consegue iniciar jobs entre ~21:55
// e ~23:10 BRT ("job startup timeout" em todo job dessa faixa desde 16/10/2026),
// entao o agendamento la nao e confiavel. Este caminho nao passa pelo pg_cron.
// Os jobs do pg_cron continuam; quem chegar primeiro publica e o outro pula
// (a funcao e o /api/gympulse-ranking travam duplicidade pelo dia).
//
// Fica em lib/ (e nao em api/) porque o plano Hobby aceita no maximo 12 funcoes
// por deploy: quem atende o cron e o proprio /api/gympulse-ranking, no GET.
//
// Cron do Vercel (vercel.json), seg-sex: 01h UTC e 02h UTC do dia seguinte.
// No plano Hobby o disparo cai em qualquer minuto dentro da hora, ou seja,
// 22:00-22:59 e 23:00-23:59 BRT.
//
// Seguranca: so age entre 22:00 e 23:59 de Brasilia (antes disso o ranking do
// dia ainda esta incompleto) e de segunda a sexta. Fora disso nao chama nada.
// Autenticacao igual a auto-content.js: CRON_SECRET ou user-agent vercel-cron.
// O segredo enviado ao Gympulse e o mesmo GYMPULSE_RANKING_SECRET (e o valor de
// instagran_export_config.shared_secret).

const EXPORT_URL = 'https://ndzbfvxnallshfiouszk.supabase.co/functions/v1/ranking-export-instagran';

// Mesmo Supabase do painel (anon key publica, igual a de gympulse-ranking.js).
const SUPABASE_URL = 'https://ggphrgfgckpsspbsguhp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdncGhyZ2ZnY2twc3NwYnNndWhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3NzE2NDUsImV4cCI6MjEwNDM0NzY0NX0.t_dF5I6c0wCBqOnJd6ko6Jpu_ZQyQ5ulA8buRYLAMMk';
const LOG_KEY = 'gympulse_ranking_trigger_log';
const MAX_LOG_ENTRIES = 40;
// A funcao do Gympulse (ranking-export-instagran) agora tenta so 1x com ate
// ~100s (ver supabase/functions/ranking-export-instagran/index.ts); este
// timeout precisa cobrir isso com folga, sem passar do maxDuration (120s,
// vercel.json) desta propria funcao. Por isso so uma tentativa aqui: uma
// segunda, com esse tamanho, nao caberia no tempo que resta.
const ATTEMPT_TIMEOUT_MS = 110 * 1000;

function supabase(path, options = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
}

// Guarda as ultimas execucoes (o log do Vercel Hobby so dura 1h).
async function appendLog(entry) {
  try {
    const res = await supabase(`painel_gilson_state?key=eq.${LOG_KEY}&select=value`);
    const rows = res.ok ? await res.json() : [];
    const list = Array.isArray(rows[0] && rows[0].value) ? rows[0].value : [];
    const value = [entry, ...list].slice(0, MAX_LOG_ENTRIES);
    await supabase('painel_gilson_state', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify([{ key: LOG_KEY, value, updated_at: new Date().toISOString() }]),
    });
  } catch (e) {
    console.error('[gympulse-ranking-trigger] log:', e.message || e);
  }
}

async function callExport(secret) {
  try {
    const res = await fetch(EXPORT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-export-secret': secret },
      body: '{}',
      signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
    });
    let body = {};
    try { body = await res.json(); } catch (e) { /* corpo vazio ou HTML do gateway */ }
    return { status: res.status, body };
  } catch (e) {
    return { status: 0, body: { error: String(e.message || e) } };
  }
}

module.exports = async function triggerExport(req, res) {
  const bearer = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const isCron = !!(process.env.CRON_SECRET && bearer === process.env.CRON_SECRET)
    || (req.method === 'GET' && /vercel-cron/i.test(req.headers['user-agent'] || ''));
  if (!isCron) {
    res.status(401).json({ error: 'Nao autorizado' });
    return;
  }

  const secret = process.env.GYMPULSE_RANKING_SECRET;
  if (!secret) {
    res.status(503).json({ error: 'GYMPULSE_RANKING_SECRET nao configurada no Vercel.' });
    return;
  }

  // Horario de Brasilia (UTC-3, sem horario de verao)
  const nowBr = new Date(Date.now() - 3 * 3600 * 1000);
  const hourBr = nowBr.getUTCHours();
  const weekdayBr = nowBr.getUTCDay();
  const date = nowBr.toISOString().slice(0, 10);
  if (weekdayBr === 0 || weekdayBr === 6 || hourBr < 22) {
    res.status(200).json({ skipped: 'fora da janela seg-sex 22:00-23:59 BRT', date, hourBr });
    return;
  }

  // Uma unica tentativa: o timeout acima ja cobre o pior caso da funcao do
  // Gympulse com folga; uma segunda tentativa nao caberia no maxDuration
  // (120s) desta funcao. A proxima janela de cron (22h ou 23h) e quem
  // reitenta se esta falhar.
  const result = await callExport(secret);

  const ok = result.status >= 200 && result.status < 300;
  const summary = {
    at: new Date().toISOString(),
    date,
    http: result.status,
    ok,
    result: result.body && (result.body.skipped || result.body.status || result.body.error) || null,
  };
  await appendLog(summary);
  res.status(ok ? 200 : 502).json(summary);
};
