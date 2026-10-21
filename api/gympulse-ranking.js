// Recebe o ranking do dia exportado pelo Gympulse e publica no Instagram da
// ACADEMIA (Planeta Corpo Club+) como Story, via Zernio.
//
// Fluxo: Gympulse (cron no horario de cada dia) -> POST aqui com o ranking em
// JSON -> geramos o card em PNG (lib/ranking-card.js, mesmo desenho do app) ->
// sobe a imagem no storage da Zernio -> cria o Story com publishNow.
//
// Seguranca: so aceita quem manda o segredo compartilhado (GYMPULSE_RANKING_SECRET,
// variavel do Vercel; o mesmo valor fica em instagran_export_config no Gympulse).
// Idempotencia: cada dia tem uma chave (ex.: planeta-corpo-2026-10-13); reenvio da
// mesma chave nao publica de novo. O controle fica na chave gympulse_ranking_log
// do painel_gilson_state.
//
// Corpo (v1):
//   { version: 1, idempotencyKey, mode?: 'publish'|'upload'|'render',
//     theme: 'gold'|'dark'|'neon'|'orange'|'pink'|'purple',
//     tenant: { name }, weekdayLabel, dateLabel, caption?,
//     students: [{ name, points, calories, minutes, levelIcon?, avatarUrl?, avatarColor? }] (top 10) }
//   mode 'render'  -> so devolve o PNG (base64), sem tocar na Zernio
//   mode 'upload'  -> gera e sobe a imagem na Zernio, sem criar o post
//   mode 'publish' -> (padrao) publica o Story agora
//
// GET (cron do Vercel, seg-sex 22h/23h BRT): dispara a exportacao no Gympulse,
// sem depender do pg_cron de la (ver lib/gympulse-ranking-trigger.js).

const crypto = require('crypto');
const { renderRankingCard, THEMES } = require('../lib/ranking-card');
const triggerExport = require('../lib/gympulse-ranking-trigger');

const ZERNIO_BASE = 'https://zernio.com/api/v1';
// Mesmo ID da conta da Academia usado em publish-zernio.js (ZERNIO_ACCOUNT_ACADEMIA troca a conta).
const ACADEMIA_ACCOUNT_ID = process.env.ZERNIO_ACCOUNT_ACADEMIA || '6ace80c0a737012bc49cb80c';

// Mesmo Supabase do painel (anon key publica, igual a de auto-publish.js / sync-posts.js).
const SUPABASE_URL = 'https://ggphrgfgckpsspbsguhp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdncGhyZ2ZnY2twc3NwYnNndWhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3NzE2NDUsImV4cCI6MjEwNDM0NzY0NX0.t_dF5I6c0wCBqOnJd6ko6Jpu_ZQyQ5ulA8buRYLAMMk';
const LOG_KEY = 'gympulse_ranking_log';
const IN_PROGRESS_MS = 10 * 60 * 1000;
const MAX_LOG_ENTRIES = 60;

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function safeEqual(a, b) {
  const x = Buffer.from(String(a || ''));
  const y = Buffer.from(String(b || ''));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

async function readLog() {
  const res = await supabase(`painel_gilson_state?key=eq.${LOG_KEY}&select=value`);
  if (!res.ok) throw new Error('Falha ao ler o controle de publicacoes (Supabase ' + res.status + ')');
  const rows = await res.json();
  const value = rows[0] && rows[0].value;
  return value && typeof value === 'object' ? value : {};
}

async function writeLog(log) {
  // mantem so as entradas mais recentes
  const entries = Object.entries(log).sort((a, b) => String(b[1].at || '').localeCompare(String(a[1].at || ''))).slice(0, MAX_LOG_ENTRIES);
  const res = await supabase('painel_gilson_state', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify([{ key: LOG_KEY, value: Object.fromEntries(entries), updated_at: new Date().toISOString() }]),
  });
  if (!res.ok) throw new Error('Falha ao gravar o controle de publicacoes (Supabase ' + res.status + ')');
}

// Le, altera uma entrada e grava (relendo antes, para nao pisar numa gravacao paralela).
async function setLogEntry(key, entry) {
  const log = await readLog();
  log[key] = { ...(log[key] || {}), ...entry, at: new Date().toISOString() };
  await writeLog(log);
}

async function zernio(path, apiKey, options = {}) {
  const res = await fetch(`${ZERNIO_BASE}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  let data = {};
  try { data = await res.json(); } catch (e) { /* corpo vazio */ }
  if (!res.ok) throw new Error(`Zernio ${path} -> ${res.status}: ${data.error || JSON.stringify(data)}`);
  return data;
}

async function uploadToZernio(png, apiKey, fileName) {
  const presign = await zernio('/media/presign', apiKey, {
    method: 'POST',
    body: JSON.stringify({ filename: fileName, contentType: 'image/png' }),
  });
  const put = await fetch(presign.uploadUrl, { method: 'PUT', headers: { 'Content-Type': 'image/png' }, body: png });
  if (!put.ok) throw new Error('Falha ao enviar a imagem para a Zernio (status ' + put.status + ')');
  return presign.publicUrl;
}

function validate(body) {
  if (!body || body.version !== 1) return 'version deve ser 1';
  if (!/^[a-z0-9-]{6,80}$/.test(String(body.idempotencyKey || ''))) return 'idempotencyKey invalida';
  if (!THEMES[body.theme]) return 'theme desconhecido: ' + body.theme;
  if (!body.tenant || !body.tenant.name) return 'tenant.name obrigatorio';
  if (!body.weekdayLabel || !body.dateLabel) return 'weekdayLabel e dateLabel obrigatorios';
  if (!Array.isArray(body.students) || body.students.length < 3) return 'students precisa ter ao menos 3 alunos';
  for (const s of body.students.slice(0, 10)) {
    if (!s || !s.name || !Number.isFinite(s.points) || !Number.isFinite(s.calories) || !Number.isFinite(s.minutes)) {
      return 'aluno invalido (name/points/calories/minutes)';
    }
  }
  if (body.mode && !['publish', 'upload', 'render'].includes(body.mode)) return 'mode invalido';
  return null;
}

module.exports = async (req, res) => {
  if (req.method === 'GET') return triggerExport(req, res);
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Metodo nao permitido' });
    return;
  }
  const secret = process.env.GYMPULSE_RANKING_SECRET;
  if (!secret) {
    res.status(503).json({ error: 'GYMPULSE_RANKING_SECRET nao configurada no Vercel.' });
    return;
  }
  if (!safeEqual(req.headers['x-gympulse-secret'], secret)) {
    res.status(401).json({ error: 'Nao autorizado' });
    return;
  }

  let body;
  try {
    body = JSON.parse(await readBody(req));
  } catch (e) {
    res.status(400).json({ error: 'JSON invalido' });
    return;
  }
  const problem = validate(body);
  if (problem) {
    res.status(400).json({ error: problem });
    return;
  }

  const mode = body.mode || 'publish';
  const key = body.idempotencyKey;
  const apiKey = process.env.ZERNIO_API_KEY;

  try {
    if (mode !== 'render' && !apiKey) {
      res.status(500).json({ error: 'ZERNIO_API_KEY nao configurada no Vercel.' });
      return;
    }

    // Duplicidade / publicacao em andamento (so no modo real)
    if (mode === 'publish') {
      const entry = (await readLog())[key];
      if (entry && (entry.status === 'sent' || entry.status === 'ok')) {
        res.status(200).json({ ok: true, duplicate: true, status: entry.status, postId: entry.postId || null });
        return;
      }
      if (entry && entry.status === 'publishing' && Date.now() - Date.parse(entry.at) < IN_PROGRESS_MS) {
        res.status(409).json({ error: 'Publicacao desta chave ja esta em andamento', status: 'publishing' });
        return;
      }
      await setLogEntry(key, { status: 'publishing', theme: body.theme });
    }

    const png = await renderRankingCard(body);
    if (mode === 'render') {
      res.status(200).json({ ok: true, mode, bytes: png.length, png: png.toString('base64') });
      return;
    }

    const publicUrl = await uploadToZernio(png, apiKey, `ranking-${key}.png`);
    if (mode === 'upload') {
      res.status(200).json({ ok: true, mode, bytes: png.length, publicUrl });
      return;
    }

    const caption = String(body.caption || `🏆 Ranking do dia — ${body.tenant.name}`).slice(0, 2000);
    const created = await zernio('/posts', apiKey, {
      method: 'POST',
      body: JSON.stringify({
        content: caption,
        mediaItems: [{ type: 'image', url: publicUrl }],
        platforms: [{ platform: 'instagram', accountId: ACADEMIA_ACCOUNT_ID, platformSpecificData: { contentType: 'story' } }],
        publishNow: true,
      }),
    });
    const postId = created.post ? created.post._id : created._id;
    await setLogEntry(key, { status: 'sent', postId, publicUrl, theme: body.theme });

    // A Zernio publica de forma assincrona: confere ate ~20s; se ainda nao
    // confirmou, devolve "pending" (o post segue sendo processado la).
    let status = 'pending';
    let permalink = null;
    let errorMessage = null;
    for (let i = 0; i < 5; i++) {
      await sleep(4000);
      try {
        const data = await zernio(`/posts/${postId}`, apiKey);
        const post = data.post || data;
        const ig = (post.platforms || []).find((p) => p.platform === 'instagram');
        const igStatus = String((ig && ig.status) || '').toLowerCase();
        if (igStatus === 'published') { status = 'published'; permalink = ig.platformPostUrl || null; break; }
        if (igStatus === 'failed') { status = 'failed'; errorMessage = ig.errorMessage || 'Zernio reportou falha'; break; }
      } catch (e) { /* tenta de novo */ }
    }

    if (status === 'published') await setLogEntry(key, { status: 'ok', permalink });
    if (status === 'failed') await setLogEntry(key, { status: 'error', errorMessage });

    res.status(status === 'failed' ? 502 : 200).json({
      ok: status !== 'failed', status, postId, permalink, error: errorMessage, theme: body.theme, bytes: png.length,
    });
  } catch (e) {
    console.error('[gympulse-ranking]', e);
    if (mode === 'publish') {
      try { await setLogEntry(key, { status: 'error', errorMessage: String(e.message || e).slice(0, 300) }); } catch (_) { /* melhor esforco */ }
    }
    res.status(502).json({ error: e.message || 'Erro inesperado ao publicar o ranking.' });
  }
};
