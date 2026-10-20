// Modo Automático: gera o conteúdo (texto + briefing) dos próximos 3 dias de cada marca
// com OpenAI, seguindo o CONTEXTO.md (regras, campanhas ativas, produtos, equipe).
//
// Quem chama:
//   - Cron diário do Vercel (GET, Authorization: Bearer CRON_SECRET) -> todas as marcas ligadas.
//   - Painel, ao ligar o botão (POST { profile }) -> só aquela marca, e só se estiver ligada.
// Regras de segurança/custo: só gera para marca com o modo ligado (linha auto_mode),
// só preenche o que falta (nunca sobrescreve) e chamadas do painel têm intervalo mínimo.
//
// Estado no painel_gilson_state:
//   auto_mode            { academia: bool, sorveteria: bool, gympulse: bool }
//   auto_cards_<marca>   [ card, ... ]  (o painel injeta no CONTENT ao sincronizar)
//   auto_state           { <marca>: { lastRun: ISO } }

const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://ggphrgfgckpsspbsguhp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdncGhyZ2ZnY2twc3NwYnNndWhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3NzE2NDUsImV4cCI6MjEwNDM0NzY0NX0.t_dF5I6c0wCBqOnJd6ko6Jpu_ZQyQ5ulA8buRYLAMMk';
const OPENAI_URL = 'https://api.openai.com/v1';

const DAYS_AHEAD = 3;
const BROWSER_MIN_INTERVAL_MS = 5 * 60 * 1000;
const CRON_MIN_INTERVAL_MS = 6 * 60 * 60 * 1000;
const PROFILES = ['academia', 'sorveteria', 'gympulse'];

// Volume diário e horários (CONTEXTO.md — "Volume Diário e Formatos").
const PROFILE_RULES = {
  academia:   { perDay: 3, times: ['07h00', '12h00', '18h30'], postWeekday: 4, label: 'Academia Planeta Corpo Club+', section: 'Academia' },
  sorveteria: { perDay: 4, times: ['09h00', '12h00', '15h30', '19h00'], postWeekday: 5, label: 'Sorvetes Guri', section: 'Sorveteria' },
  gympulse:   { perDay: 1, times: ['12h00'], postEveryDays: 15, label: 'GympulsePro', section: 'GympulsePro' }
};

const FORMAT_SPECS = {
  Story: { tipo: 'Story Instagram', dimensoes: '1080 × 1920px (9:16)' },
  Post: { tipo: 'Post Feed Instagram', dimensoes: '1080 × 1350px (4:5)' }
};

function supabase(p, options = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${p}`, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
}

async function readRows() {
  const r = await supabase('painel_gilson_state?key=not.like.brand_*&select=key,value');
  if (!r.ok) throw new Error('Falha ao ler estado do Supabase');
  const rows = await r.json();
  const map = {};
  rows.forEach(row => { map[row.key] = row.value; });
  return map;
}

async function writeRow(key, value) {
  const r = await supabase('painel_gilson_state', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify([{ key, value, updated_at: new Date().toISOString() }])
  });
  if (!r.ok) throw new Error(`Falha ao gravar ${key}: ${await r.text()}`);
}

// ── Datas (America/Sao_Paulo) ─────────────────────────────────────────────
function todayBR() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}
function addDays(ds, n) {
  const [y, m, d] = ds.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}
function weekdayOf(ds) {
  const [y, m, d] = ds.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}
function epochDay(ds) {
  const [y, m, d] = ds.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}
// Segunda-feira da semana de ds (chave da semana para "1 Post por semana").
function weekKey(ds) {
  const wd = weekdayOf(ds);
  return addDays(ds, wd === 0 ? -6 : 1 - wd);
}
const WEEKDAYS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];

// ── Planejamento do que falta em cada dia ─────────────────────────────────
function planDay(profile, date, occupied) {
  const rules = PROFILE_RULES[profile];
  const missing = rules.perDay - occupied.length;
  if (missing <= 0) return [];

  const usedTimes = new Set(occupied.map(o => o.time));
  const freeTimes = rules.times.filter(t => !usedTimes.has(t)).slice(0, missing);
  if (!freeTimes.length) return [];

  // Post de feed: Academia (quinta) e Sorveteria (sexta) 1x/semana; Gympulse a cada 15 dias.
  const hasPostThatWeek = occupied.some(o => o.format === 'Post') || occupied.weekHasPost;
  let wantsPost = false;
  if (rules.postEveryDays) wantsPost = epochDay(date) % rules.postEveryDays === 0 && !occupied.some(o => o.format === 'Post');
  else wantsPost = weekdayOf(date) === rules.postWeekday && !hasPostThatWeek;

  return freeTimes.map((time, i) => ({ time, format: wantsPost && i === 0 ? 'Post' : 'Story' }));
}

// ── Contexto: CONTEXTO.md inteiro, sempre ─────────────────────────────────
function loadContext() {
  const candidates = [path.join(process.cwd(), 'CONTEXTO.md'), path.join(__dirname, '..', 'CONTEXTO.md')];
  for (const f of candidates) {
    try { return fs.readFileSync(f, 'utf8'); } catch (e) { /* tenta o próximo */ }
  }
  throw new Error('CONTEXTO.md não encontrado no deploy');
}

function systemPrompt(profile, context) {
  const rules = PROFILE_RULES[profile];
  return `Você é o social media de Gilson Caetano e escreve o conteúdo de Instagram da marca "${rules.label}" (Turvo/PR), em português do Brasil.

Abaixo está o CONTEXTO.md do projeto. Ele é a fonte da verdade: siga TODAS as regras fixas (volume, formatos, hashtags, sem texto sobreposto na imagem, dimensões), a seção "${rules.section}", a campanha/promoção ATIVA na data do post (e o calendário dela), as listas de produtos, a equipe para humanização e as regras de sensibilidade (ex.: Outubro Rosa, dia 19/10 institucional sem oferta). Nunca invente preço, condição, prazo, sabor, funcionalidade ou dado que não esteja no contexto; sem preço confirmado, escreva sem valor. Nunca cite concorrentes. Campanhas marcadas como ENCERRADAS não podem ser anunciadas.

Regras de saída:
- Story: 0 hashtags. Post: exatamente 5 hashtags no final da legenda.
- Sem Reel e sem Carrossel.
- A legenda ("texto") deve estar pronta para publicar, com emojis com moderação, tom de voz da marca e CTA coerente.
- "briefing_visual" descreve a imagem (cena, elementos, cores, estilo) SEM texto sobreposto na imagem.
- Varie ângulo e pilar entre os posts; não repita o que já existe (lista fornecida).
- Responda SOMENTE JSON: {"posts":[{"title":"","pilar":"","objetivo":"","publico":"","tom":"","cta":"","texto":"","briefing_visual":""}]} com um item por slot, na mesma ordem dos slots.

===== CONTEXTO.md =====
${context}`;
}

function userPrompt(profile, date, slots, existing) {
  const lines = slots.map((s, i) => `${i + 1}. ${s.time} — ${s.format}`).join('\n');
  const jaExiste = existing.length
    ? existing.map(e => `- ${e.date} ${e.time} ${e.format}: ${String(e.caption || '').replace(/\s+/g, ' ').slice(0, 110)}`).join('\n')
    : '(nada próximo)';
  return `Data: ${date} (${WEEKDAYS[weekdayOf(date)]}).
Gere os posts destes slots do dia:
${lines}

Posts já existentes/recentes desta marca (não repetir tema nem frase):
${jaExiste}`;
}

async function callOpenAI(system, user) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY não configurada no Vercel');
  const models = [...new Set([process.env.OPENAI_TEXT_MODEL, 'gpt-4.1', 'gpt-4o'].filter(Boolean))];
  let lastError = '';
  for (const model of models) {
    const r = await fetch(`${OPENAI_URL}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        temperature: 0.8,
        response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }]
      })
    });
    if (!r.ok) { lastError = `${model} ${r.status}: ${(await r.text()).slice(0, 200)}`; continue; }
    const data = await r.json();
    const content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed.posts)) return parsed.posts;
      lastError = `${model}: resposta sem "posts"`;
    } catch (e) { lastError = `${model}: JSON inválido`; }
  }
  throw new Error('OpenAI falhou: ' + lastError);
}

// O painel renderiza via innerHTML e a legenda vai crua para a Zernio: só tiramos < e >.
const clean = (s) => String(s == null ? '' : s).replace(/[<>]/g, '').trim();

function buildCard(profile, date, slot, n, p) {
  const spec = FORMAT_SPECS[slot.format];
  const compact = date.replace(/-/g, '');
  const id = `au_${profile}_${compact}_${n}`;
  return {
    id, date, time: slot.time, format: slot.format,
    title: clean(p.title).slice(0, 90) || 'Post automático',
    driveFile: `${compact.slice(4)}_${profile}_auto${n}.png`,
    driveUrl: '#',
    driveHint: clean(p.briefing_visual).slice(0, 160),
    texto: clean(p.texto),
    auto: true,
    secoes: [
      { num: '01', cor: '#e63900', titulo: 'FORMATO E ESPECIFICAÇÕES',
        conteudo: `Tipo: ${spec.tipo}\nDimensões: ${spec.dimensoes}\nSem texto sobreposto na imagem (todo copy vai na legenda).` },
      { num: '02', cor: '#f5a623', titulo: 'INTENÇÃO DA POSTAGEM',
        conteudo: `Pilar: ${clean(p.pilar)}\nObjetivo: ${clean(p.objetivo)}\nPúblico-alvo: ${clean(p.publico)}\nTom de voz: ${clean(p.tom)}\nCTA: ${clean(p.cta)}` },
      { num: '03', cor: '#4ade80', titulo: 'BRIEFING CRIATIVO DETALHADO',
        conteudo: clean(p.briefing_visual) }
    ]
  };
}

async function runProfile(profile, rows, now) {
  const manifest = rows.manifest || {};
  const deleted = new Set(Array.isArray(rows.deleted) ? rows.deleted : []);
  const cards = Array.isArray(rows['auto_cards_' + profile]) ? rows['auto_cards_' + profile] : [];
  const today = todayBR();

  // Descarta cards automáticos antigos (histórico fica no painel/Supabase do histórico, não aqui).
  const keptCards = cards.filter(c => c.date >= addDays(today, -1));

  // Tudo que já ocupa slot (manifest = futuros do painel; auto = gerados; excluídos contam como ocupados).
  const items = [];
  Object.keys(manifest).forEach(id => {
    const m = manifest[id];
    if (m && m.profile === profile) items.push({ id, date: m.date, time: m.time, format: m.format, caption: m.caption });
  });
  keptCards.forEach(c => { if (!items.some(i => i.id === c.id)) items.push({ id: c.id, date: c.date, time: c.time, format: c.format, caption: c.texto }); });

  const created = [];
  const context = loadContext();
  const system = systemPrompt(profile, context);
  const pending = [];

  for (let k = 1; k <= DAYS_AHEAD; k++) {
    const date = addDays(today, k);
    const occupied = items.filter(i => i.date === date);
    // Ids automáticos excluídos pelo usuário continuam ocupando o slot.
    const deletedAuto = [...deleted].filter(id => id.startsWith(`au_${profile}_${date.replace(/-/g, '')}_`));
    deletedAuto.forEach(id => { if (!occupied.some(o => o.id === id)) occupied.push({ id, date, time: '', format: 'Story' }); });
    occupied.weekHasPost = items.some(i => i.format === 'Post' && weekKey(i.date) === weekKey(date));
    const slots = planDay(profile, date, occupied);
    if (!slots.length) continue;
    const recent = items.filter(i => Math.abs(epochDay(i.date) - epochDay(date)) <= 4 && i.caption).slice(0, 12);
    pending.push({ date, slots, recent });
  }

  const results = await Promise.all(pending.map(async ({ date, slots, recent }) => {
    const posts = await callOpenAI(system, userPrompt(profile, date, slots, recent));
    return { date, slots, posts };
  }));

  results.forEach(({ date, slots, posts }) => {
    let n = 1;
    slots.forEach((slot, i) => {
      if (!posts[i] || !clean(posts[i].texto)) return;
      const used = new Set(keptCards.map(c => c.id));
      while (used.has(`au_${profile}_${date.replace(/-/g, '')}_${n}`) || deleted.has(`au_${profile}_${date.replace(/-/g, '')}_${n}`)) n++;
      const card = buildCard(profile, date, slot, n, posts[i]);
      keptCards.push(card);
      created.push(card);
      n++;
    });
  });

  if (created.length || keptCards.length !== cards.length) {
    await writeRow('auto_cards_' + profile, keptCards);
  }
  if (created.length) {
    // Deixa o cron de publicação enxergar os cards mesmo antes de o painel sincronizar.
    const fresh = await readRows();
    const man = { ...(fresh.manifest || {}) };
    created.forEach(c => { man[c.id] = { profile, date: c.date, time: c.time, format: c.format, caption: c.texto }; });
    await writeRow('manifest', man);
  }
  return { profile, created: created.length, ids: created.map(c => c.id) };
}

module.exports = async (req, res) => {
  const bearer = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const isCron = !!(process.env.CRON_SECRET && bearer === process.env.CRON_SECRET)
    || !!(process.env.AUTO_PUBLISH_SECRET && req.headers['x-auto-publish-secret'] === process.env.AUTO_PUBLISH_SECRET);
  const looksLikeVercelCron = req.method === 'GET' && /vercel-cron/i.test(req.headers['user-agent'] || '');

  try {
    let body = req.body || {};
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }

    let targets;
    if (req.method === 'POST' && !isCron) {
      if (!PROFILES.includes(body.profile)) { res.status(400).json({ error: 'profile inválido' }); return; }
      targets = [body.profile];
    } else if (isCron || looksLikeVercelCron) {
      targets = PROFILES;
    } else {
      res.status(401).json({ error: 'Não autorizado' });
      return;
    }

    const rows = await readRows();
    const mode = rows.auto_mode || {};
    const state = rows.auto_state || {};
    const now = Date.now();
    const minInterval = (req.method === 'POST' && !isCron) ? BROWSER_MIN_INTERVAL_MS : (isCron ? 0 : CRON_MIN_INTERVAL_MS);

    const out = [];
    for (const profile of targets) {
      if (!mode[profile]) { out.push({ profile, skipped: 'modo automático desligado' }); continue; }
      const last = state[profile] && Date.parse(state[profile].lastRun);
      if (last && now - last < minInterval) { out.push({ profile, skipped: 'executado há pouco' }); continue; }
      state[profile] = { lastRun: new Date(now).toISOString() };
      try { out.push(await runProfile(profile, rows, now)); }
      catch (e) { out.push({ profile, error: e.message }); }
    }
    await writeRow('auto_state', state);
    res.status(200).json({ ok: true, results: out });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
