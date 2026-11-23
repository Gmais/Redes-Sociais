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
//
// "Gerar nova postagem" do editor de card (POST { acao: 'tema', profile, tema, format, date, time, id }):
// mesmo gerador (CONTEXTO.md + voz + dados reais), 1 post sobre o tema pedido. Só devolve o texto;
// não grava nada — o painel preenche o editor e o Gilson decide se salva.

const fs = require('fs');
const path = require('path');
const sim = require('../lib/caption-similarity');
const guri = require('../lib/guri-catalog');
const { exigirLogin } = require('../lib/zernio-login');

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

// Voz de cada marca (instagram/<pasta>/voice.md). Os mesmos arquivos que as skills ig-* usam.
// Caminhos literais para o rastreador de arquivos do Vercel enxergar; vercel.json também inclui.
const VOICE_FILES = {
  academia:   path.join(__dirname, '..', 'instagram', 'planeta-corpo', 'voice.md'),
  sorveteria: path.join(__dirname, '..', 'instagram', 'sorveteria-guri', 'voice.md'),
  gympulse:   path.join(__dirname, '..', 'instagram', 'gympulse', 'voice.md')
};
const VOICE_DIRS = { academia: 'planeta-corpo', sorveteria: 'sorveteria-guri', gympulse: 'gympulse' };

// O Modo Automático só usa Story e Post; Carrossel e Reel existem para o "Gerar nova postagem",
// que respeita o formato que o card já tem no editor.
const FORMAT_SPECS = {
  Story: { tipo: 'Story Instagram', dimensoes: '1080 × 1920px (9:16)' },
  Post: { tipo: 'Post Feed Instagram', dimensoes: '1080 × 1350px (4:5)' },
  Carrossel: { tipo: 'Carrossel Instagram', dimensoes: '1080 × 1350px (4:5) por slide' },
  Reel: { tipo: 'Reel Instagram', dimensoes: '1080 × 1920px (9:16)' }
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

// voice.md da marca sem os trechos ainda não respondidos ("[PREENCHER: ...]"). Tira só o trecho;
// a linha cai apenas se ficar sem conteúdo (ex.: "- **Pace:**" ou "3."). Sem o arquivo, a geração
// segue só com o CONTEXTO.md (como antes) — a voz é um reforço, não pode derrubar o cron.
function stripPending(text) {
  return text.split('\n').map(l => {
    if (!l.includes('[PREENCHER')) return l;
    const rest = l.replace(/\s*`?\[PREENCHER[^\]]*\]`?/g, '').trimEnd();
    return /^\s*(-|\d+\.)?\s*(\*\*[^*]*\*\*)?\s*$/.test(rest) ? null : rest;
  }).filter(l => l !== null).join('\n').trim();
}

// Legendas aprovadas do voice.md (linhas "1. Rótulo: "texto"" ou "- Rótulo: "texto""). Entram na
// checagem de repetição: a IA deve imitar o jeito, não devolver a frase. O rótulo vira título,
// então "Encerramento do dia" segue como template (pode parecer com o modelo, é a regra).
function voiceExamples(profile, voice) {
  const out = [];
  String(voice || '').split('\n').forEach((l) => {
    const m = /^\s*(?:\d+\.|-)\s+([^:"*\n]{2,60}):\s+"(.{20,})"\s*$/.exec(l);
    if (m) out.push({ id: `__voz_${profile}_${out.length}`, profile, title: 'exemplo da voz: ' + m[1].trim(), texto: m[2] });
  });
  return out;
}

// Travessão é marca de texto de IA: na legenda vira vírgula (ou hífen, colado entre palavras).
function noDash(s) {
  return String(s).replace(/\s+[—–]\s+/g, ', ').replace(/[—–]/g, '-');
}

function loadVoice(profile) {
  const candidates = [VOICE_FILES[profile], path.join(process.cwd(), 'instagram', VOICE_DIRS[profile], 'voice.md')];
  for (const f of candidates) {
    try { return stripPending(fs.readFileSync(f, 'utf8')); } catch (e) { /* tenta o próximo */ }
  }
  return '';
}

const AUTO_OUTPUT_RULES = `Regras de saída:
- Story: 0 hashtags. Post: exatamente 5 hashtags no final da legenda.
- Sem Reel e sem Carrossel.
- A legenda ("texto") deve estar pronta para publicar, com emojis do jeito que a voz da marca pede, tom de voz da marca e CTA coerente.
- Sem travessão (— ou –) nas legendas: use vírgula, ponto ou dois-pontos.
- Story não pode ser salvo: em Story, nunca peça para salvar; "salve este post" só em Post.
- "briefing_visual" descreve a imagem (cena, elementos, cores, estilo) SEM texto sobreposto na imagem.
- Varie ângulo e pilar entre os posts; não repita o que já existe (lista fornecida).
- Responda SOMENTE JSON: {"posts":[{"title":"","pilar":"","objetivo":"","publico":"","tom":"","cta":"","texto":"","briefing_visual":"","produto":""}]} com um item por slot, na mesma ordem dos slots. "produto" = nome EXATO de um item do CATÁLOGO REAL quando o post é sobre esse item; vazio nos demais.`;

function systemPrompt(profile, context, voice, extra, outputRules = AUTO_OUTPUT_RULES) {
  const rules = PROFILE_RULES[profile];
  const extraBlock = extra ? '\n\n' + extra : '';
  const voiceBlock = voice ? `

===== VOZ DA MARCA (instagram/${VOICE_DIRS[profile]}/voice.md) =====
Este arquivo define COMO escrever: tom, palavras que a marca usa e as proibidas, emojis, assuntos evitados, bordão, legendas aprovadas (imite o jeito, nunca copie a frase) e CTA. Em fato, número, preço, campanha, formato ou frequência, o CONTEXTO.md manda.
${voice}` : '';
  return `Você é o social media de Gilson Caetano e escreve o conteúdo de Instagram da marca "${rules.label}" (Turvo/PR), em português do Brasil.

Abaixo está o CONTEXTO.md do projeto. Ele é a fonte da verdade: siga TODAS as regras fixas (volume, formatos, hashtags, sem texto sobreposto na imagem, dimensões), a seção "${rules.section}", a campanha/promoção ATIVA na data do post (e o calendário dela), as listas de produtos, a equipe para humanização e as regras de sensibilidade (ex.: Outubro Rosa, dia 19/10 institucional sem oferta). Nunca invente preço, condição, prazo, sabor, funcionalidade ou dado que não esteja no contexto; sem preço confirmado, escreva sem valor. Nunca cite concorrentes. Campanhas marcadas como ENCERRADAS não podem ser anunciadas.${voice ? '\n\nDepois do CONTEXTO.md vem a VOZ DA MARCA: siga-a no tom, nas palavras, nos emojis e no CTA de cada legenda.' : ''}

${outputRules}

===== CONTEXTO.md =====
${context}${voiceBlock}${extraBlock}`;
}

// Academia e GympulsePro: números reais que o GymFit e o GymPulse gravam todo dia às 05h30 (Brasília)
// em painel_gilson_state (chaves dados_*; SQL em integracoes/). Só totais e médias, sem aluno.
// Dado com mais de 3 dias é ignorado (o envio parou): melhor sem número do que número velho.
const nf = (n) => Number(n || 0).toLocaleString('pt-BR');
function fresh(d) {
  const t = d && Date.parse(d.atualizado_em);
  return t && Date.now() - t < 3 * 86400000 ? d : null;
}
function liveDataBlock(profile, rows) {
  const gf = fresh(rows.dados_gymfit), gp = fresh(rows.dados_gympulse_planeta), pl = fresh(rows.dados_gympulse_plataforma);
  const dia = (d) => d.atualizado_em.slice(8, 10) + '/' + d.atualizado_em.slice(5, 7);
  const linhas = [];
  if (profile === 'academia') {
    if (gf) linhas.push(`Catraca da academia (GymFit, últimos 30 dias, atualizado ${dia(gf)}): ${nf(gf.alunos_ativos)} alunos ativos; ${nf(gf.alunos_que_treinaram_30d)} alunos treinaram no período; cerca de ${nf(gf.media_treinos_por_dia_30d)} treinos por dia; média de ${String(gf.media_treinos_por_aluno_30d).replace('.', ',')} treinos por aluno no mês; horários mais cheios: ${(gf.horarios_de_pico || []).join(', ')}; dias mais movimentados: ${(gf.dias_mais_movimentados || []).join(' e ')}. ("Treino" = aluno que passou na catraca naquele dia.)`);
    if (gp) linhas.push(`Aulas monitoradas com sensor de batimento (GymPulse, últimos 30 dias, atualizado ${dia(gp)}): ${nf(gp.aulas_monitoradas)} aulas; ${nf(gp.alunos_que_treinaram)} alunos usaram o sensor; ${nf(gp.participacoes)} participações; ${nf(gp.kcal_total)} kcal no total; em média ${nf(gp.kcal_media_por_aluno_por_aula)} kcal e ${nf(gp.pontos_media_por_aluno_por_aula)} pontos por aluno em cada aula; ${nf(gp.sensores)} sensores; ${nf(gp.fitcoins_ganhos_desde_o_inicio)} fitcoins ganhos pelos alunos desde o início (${nf(gp.fitcoins_resgates_desde_o_inicio)} resgates).`);
  }
  if (profile === 'gympulse') {
    if (pl) linhas.push(`Plataforma GympulsePro inteira (atualizado ${dia(pl)}): ${nf(pl.academias)} academias usando; ${nf(pl.alunos_cadastrados)} alunos cadastrados; ${nf(pl.aulas_monitoradas_total)} aulas monitoradas desde o início (${nf(pl.aulas_monitoradas_30d)} nos últimos 30 dias); ${nf(pl.participacoes_total)} participações; ${nf(pl.kcal_total)} kcal registradas; ${nf(pl.sensores)} sensores. Nunca cite o nome de outra academia cliente.`);
    if (gp) linhas.push(`Caso real da Planeta Corpo Club+, academia do próprio Gilson (pode citar o nome; últimos 30 dias): ${nf(gp.aulas_monitoradas)} aulas monitoradas; ${nf(gp.alunos_que_treinaram)} alunos com sensor; ${nf(gp.participacoes)} participações; média de ${nf(gp.kcal_media_por_aluno_por_aula)} kcal e ${nf(gp.pontos_media_por_aluno_por_aula)} pontos por aluno por aula; ${nf(gp.fitcoins_ganhos_desde_o_inicio)} fitcoins ganhos e só ${nf(gp.fitcoins_resgates_desde_o_inicio)} resgates.`);
  }
  if (!linhas.length) return '';
  return `===== DADOS REAIS (lidos dos sistemas da empresa; valem mais do que qualquer número escrito no CONTEXTO.md ou no voice.md) =====
Use no máximo um ou dois números por post, só quando servirem ao assunto, e só estes (pode arredondar para baixo, nunca para cima). Nunca invente outro número nem cite aluno.
${linhas.map(l => '- ' + l).join('\n')}`;
}

// Sorveteria: catálogo real da loja (Siteguri). Sem ele, segue a lista da seção 7 do CONTEXTO.md.
async function sorveteriaExtra() {
  try {
    const catalog = await guri.fetchCatalog();
    if (!catalog.length) return { catalog: [], block: '' };
    return {
      catalog,
      block: `===== CATÁLOGO REAL DA LOJA (site da Sorvetes Guri, lido agora) =====
Para "Produto da loja" e posts de cardápio gourmet, escolha SÓ itens desta lista: ela manda sobre a lista "Loja" da seção 7 do CONTEXTO.md. Escreva o nome por extenso na legenda ("Pic." = picolé, "Pt" = pote, "Sorv." = sorvete, "C/" = com) e ponha o nome exato no campo "produto". Os sabores do buffet (Caixa 7L) continuam vindo da seção 7. Sem preço.
${guri.catalogPromptBlock(catalog)}`
    };
  } catch (e) {
    return { catalog: [], block: '' };
  }
}

function userPrompt(profile, date, slots, existing, notes) {
  const lines = slots.map((s, i) => `${i + 1}. ${s.time} — ${s.format}`).join('\n');
  const jaExiste = existing.length
    ? existing.map(e => `- ${e.date} ${e.time} ${e.format}: ${cut(String(e.caption || '').replace(/\s+/g, ' '), 140)}`).join('\n')
    : '(nada próximo)';
  return `Data: ${date} (${WEEKDAYS[weekdayOf(date)]}).
Gere os posts destes slots do dia:
${lines}

Posts já existentes/recentes desta marca (não repetir produto, tema nem frase):
${jaExiste}${notes ? '\n\n' + notes : ''}`;
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
        messages: [{ role: 'system', content: wellFormed(system) }, { role: 'user', content: wellFormed(user) }]
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

// Emoji é 2 unidades UTF-16: .slice(0, n) no meio dele deixa meio caractere solto, e a OpenAI
// recusa o corpo inteiro ("Invalid body: failed to parse JSON value"). Foi o que travou a
// Sorveteria de 18 a 20/11/2026: uma legenda com emoji bem na posição 140.
const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;
const wellFormed = (s) => String(s).replace(LONE_SURROGATE, '');
const cut = (s, n) => wellFormed(String(s == null ? '' : s).slice(0, n));

// Conteúdo das 3 seções do card (o editor do painel mostra cada uma num campo).
// Tipo/Dimensões nas 2 primeiras linhas da 01: o applyFormatSpec() do painel reescreve só essas.
function secaoFormato(format) {
  const spec = FORMAT_SPECS[format];
  return `Tipo: ${spec.tipo}\nDimensões: ${spec.dimensoes}\nSem texto sobreposto na imagem (todo copy vai na legenda).`;
}
function secaoIntencao(p) {
  return `Pilar: ${clean(p.pilar)}\nObjetivo: ${clean(p.objetivo)}\nPúblico-alvo: ${clean(p.publico)}\nTom de voz: ${clean(p.tom)}\nCTA: ${clean(p.cta)}`;
}

function buildCard(profile, date, slot, n, p) {
  const compact = date.replace(/-/g, '');
  const id = `au_${profile}_${compact}_${n}`;
  return {
    id, date, time: slot.time, format: slot.format,
    title: cut(clean(p.title), 90) || 'Post automático',
    driveFile: `${compact.slice(4)}_${profile}_auto${n}.png`,
    driveUrl: '#',
    driveHint: cut(clean(p.briefing_visual), 160),
    texto: noDash(clean(p.texto)),
    auto: true,
    secoes: [
      { num: '01', cor: '#e63900', titulo: 'FORMATO E ESPECIFICAÇÕES', conteudo: secaoFormato(slot.format) },
      { num: '02', cor: '#f5a623', titulo: 'INTENÇÃO DA POSTAGEM', conteudo: secaoIntencao(p) },
      { num: '03', cor: '#4ade80', titulo: 'BRIEFING CRIATIVO DETALHADO',
        conteudo: clean(p.briefing_visual) }
    ]
  };
}

// ── "Gerar nova postagem" a partir de um tema (botão no editor de card) ───────
const TEMA_MAX = 400;

function temaOutputRules(format) {
  const hashtags = (format === 'Post' || format === 'Reel') ? 'exatamente 5 hashtags no final da legenda' : '0 hashtags';
  const visual = format === 'Reel' ? 'o vídeo, cena a cena (enquadramento, ação, cores da marca, ritmo)'
    : format === 'Carrossel' ? 'cada slide (Slide 1, Slide 2, ...: cena, elementos, cores da marca, estilo)'
    : 'a imagem (cena, elementos, cores da marca, estilo, composição)';
  return `Regras de saída:
- Formato: ${format}. Hashtags: ${hashtags}.
- A legenda ("texto") deve estar pronta para publicar, com emojis do jeito que a voz da marca pede, tom de voz da marca e CTA coerente.
- Sem travessão (— ou –) nas legendas: use vírgula, ponto ou dois-pontos.${format === 'Story' ? '\n- Story não pode ser salvo: nunca peça para salvar.' : ''}
- "briefing_visual" descreve ${visual}, SEM texto sobreposto na imagem.
- O post é sobre o TEMA pedido. Se o tema pedir algo que o CONTEXTO.md proíbe ou não confirma (preço, prazo, campanha encerrada, número inventado), escreva sem isso e explique em "nota".
- Não repita frase nem ângulo dos posts recentes (lista fornecida).
- Responda SOMENTE JSON: {"posts":[{"title":"","pilar":"","objetivo":"","publico":"","tom":"","cta":"","texto":"","briefing_visual":"","nota":""}]} com exatamente 1 item. "title" = título curto do card. "nota" fica vazia quando não houver o que avisar.`;
}

// Posts da marca perto da data (painel + automáticos), sem o card que está sendo reescrito.
function recentForTema(profile, rows, date, skipId) {
  const items = [];
  const man = rows.manifest || {};
  Object.keys(man).forEach((id) => {
    const m = man[id];
    if (m && m.profile === profile && m.date && m.caption) items.push({ id, date: m.date, time: m.time, format: m.format, caption: m.caption });
  });
  (Array.isArray(rows['auto_cards_' + profile]) ? rows['auto_cards_' + profile] : []).forEach((c) => {
    if (c && c.date && c.texto && !items.some((i) => i.id === c.id)) items.push({ id: c.id, date: c.date, time: c.time, format: c.format, caption: c.texto });
  });
  return items.filter((i) => i.id !== skipId && Math.abs(epochDay(i.date) - epochDay(date)) <= 7)
    .sort((a, b) => Math.abs(epochDay(a.date) - epochDay(date)) - Math.abs(epochDay(b.date) - epochDay(date))).slice(0, 20);
}

function temaUserPrompt(date, time, format, tema, recent) {
  const jaExiste = recent.length
    ? recent.map(e => `- ${e.date} ${e.time || ''} ${e.format || ''}: ${cut(String(e.caption || '').replace(/\s+/g, ' '), 140)}`).join('\n')
    : '(nada próximo)';
  return `Data: ${date} (${WEEKDAYS[weekdayOf(date)]})${time ? ', ' + time : ''}. Formato: ${format}.
TEMA pedido pelo Gilson: "${tema}"

Gere 1 post sobre esse tema.

Posts recentes desta marca (não repetir frase nem ângulo):
${jaExiste}`;
}

// O que o editor do painel preenche: título, legenda e as 3 seções (na ordem 01, 02, 03).
function temaFields(format, p) {
  return {
    title: cut(clean(p.title), 90) || 'Nova postagem',
    texto: noDash(clean(p.texto)),
    secoes: [secaoFormato(format), secaoIntencao(p), clean(p.briefing_visual)],
    nota: cut(clean(p.nota), 400)
  };
}

async function temaHandler(req, res, body) {
  // Mesmo login das rotas da Zernio: só exige quando EXIGIR_LOGIN_ZERNIO=1 no Vercel.
  if (!(await exigirLogin(req, res))) return;
  const profile = body.profile;
  const tema = String(body.tema || '').replace(/[<>]/g, '').trim();
  const format = FORMAT_SPECS[body.format] ? body.format : 'Story';
  if (!PROFILES.includes(profile)) { res.status(400).json({ error: 'profile inválido' }); return; }
  if (tema.length < 3) { res.status(400).json({ error: 'Escreva o tema da postagem.' }); return; }
  if (tema.length > TEMA_MAX) { res.status(400).json({ error: `Tema longo demais (máx. ${TEMA_MAX} caracteres).` }); return; }
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(body.date || '')) ? body.date : todayBR();
  const time = cut(clean(body.time), 12);

  // Sem o Supabase, gera do mesmo jeito (sem dados reais e sem a lista de recentes).
  let rows = {};
  try { rows = await readRows(); } catch (e) { rows = {}; }
  const extra = profile === 'sorveteria' ? await sorveteriaExtra() : { block: '' };
  const system = systemPrompt(profile, loadContext(), loadVoice(profile),
    [extra.block, liveDataBlock(profile, rows)].filter(Boolean).join('\n\n'), temaOutputRules(format));
  const posts = await callOpenAI(system, temaUserPrompt(date, time, format, wellFormed(tema), recentForTema(profile, rows, date, body.id)));
  const p = posts[0];
  if (!p || !clean(p.texto)) { res.status(502).json({ error: 'A IA não devolveu a legenda. Tente de novo.' }); return; }
  res.status(200).json({ ok: true, post: temaFields(format, p) });
}

// ── Anti-repetição ────────────────────────────────────────────────────────
// Antes cada dia era gerado em paralelo vendo só 12 legendas dos 4 dias vizinhos: saía o
// mesmo produto em dias seguidos e o Carrinho de Sorvete 2x na semana (regra: máx. 1x).
function profileOfId(id) {
  const m = /^au_([a-z]+)_/.exec(String(id));
  if (m) return m[1];
  return ({ ac: 'academia', so: 'sorveteria', gy: 'gympulse', gp: 'gympulse' })[String(id).slice(0, 2)] || null;
}

// Tudo que a marca já tem (histórico editado, agenda do painel e cards automáticos).
function buildCorpus(profile, rows, keptCards) {
  const map = new Map();
  const put = (d) => {
    if (!d.id || !d.date || !d.texto) return;
    const old = map.get(d.id);
    if (!old || (!old.title && d.title)) map.set(d.id, { ...old, ...d });
  };
  const edits = rows.edits || {};
  Object.keys(edits).forEach((id) => {
    const e = edits[id];
    if (e && profileOfId(id) === profile) put({ id, profile, date: e.date, time: e.time, title: e.title, texto: e.texto });
  });
  const man = rows.manifest || {};
  Object.keys(man).forEach((id) => {
    const m = man[id];
    if (m && m.profile === profile) put({ id, profile, date: m.date, time: m.time, title: '', texto: m.caption });
  });
  keptCards.forEach((c) => put({ id: c.id, profile, date: c.date, time: c.time, title: c.title, texto: c.texto }));
  return [...map.values()];
}

const fmtDM = (date) => date.slice(8, 10) + '/' + date.slice(5, 7);

// Aviso antecipado no 1º prompt: assunto de 1x por semana que a semana já usou.
function weeklyNote(profile, date, corpus) {
  const w = sim.weekOf(date);
  return sim.ONCE_A_WEEK.filter((r) => r.profile === profile).map((r) => {
    const hit = corpus.find((d) => sim.weekOf(d.date) === w && r.re.test((d.title || '') + ' ' + (d.texto || '')));
    return hit ? `REGRA SEMANAL: "${r.label}" já tem post nesta semana (${fmtDM(hit.date)}). NÃO fale de ${r.label} neste dia.` : '';
  }).filter(Boolean).join('\n');
}

function hitText(h) {
  const d = h.doc;
  if (String(d.id).startsWith('__voz_')) return `copiou a legenda de exemplo da voz ("${cut(d.texto, 70)}..."): imite só o jeito, com outra situação e outras palavras`;
  const when = fmtDM(d.date) + (d.time ? ' ' + d.time : '');
  if (h.why === 'semanal') return `${h.label} já tem post nesta semana (${when}) — NÃO use esse assunto`;
  return `parecido com ${when}: "${cut(String(d.title || d.texto).replace(/\s+/g, ' '), 80)}"`;
}

function retryNote(flagged) {
  return 'ATENÇÃO — o rascunho anterior ficou parecido com posts que já existem. Reescreva estes slots com OUTRO produto/assunto, outro ângulo e frases diferentes (mantendo as regras do CONTEXTO.md):\n' +
    flagged.map((f, k) => `- slot ${k + 1} (${f.time}): ${f.hits.slice(0, 2).map(hitText).join('; ')}`).join('\n');
}

async function runProfile(profile, rows, now, startedAt) {
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
  const voice = loadVoice(profile);
  const extra = profile === 'sorveteria' ? await sorveteriaExtra() : { catalog: [], block: '' };
  const live = liveDataBlock(profile, rows);
  const system = systemPrompt(profile, context, voice, [extra.block, live].filter(Boolean).join('\n\n'));
  const catalogNames = new Set(extra.catalog.map(p => p.nome.toLowerCase()));
  const examples = voiceExamples(profile, voice);
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
    const recent = items.filter(i => Math.abs(epochDay(i.date) - epochDay(date)) <= 7 && i.caption)
      .sort((a, b) => Math.abs(epochDay(a.date) - epochDay(date)) - Math.abs(epochDay(b.date) - epochDay(date))).slice(0, 24);
    pending.push({ date, slots, recent });
  }

  const corpus = buildCorpus(profile, rows, keptCards);
  const results = await Promise.all(pending.map(async ({ date, slots, recent }) => {
    const posts = await callOpenAI(system, userPrompt(profile, date, slots, recent, weeklyNote(profile, date, corpus)));
    return { date, slots, posts, recent };
  }));

  // Compara cada post novo com o histórico e com os outros novos (em ordem de data). O que
  // ficar parecido é reescrito UMA vez (retries em paralelo para caber no tempo da função);
  // se ainda repetir um assunto de 1x/semana, o post é descartado.
  const ix = sim.createIndex(corpus);
  const accepted = [];
  const stats = { reescritos: 0, descartados: 0, parecidosMantidos: 0 };
  const check = (r, i) => {
    const p = r.posts[i];
    const draft = { id: '__novo_' + r.date + '_' + i, profile, date: r.date, time: r.slots[i].time, title: clean(p.title), texto: noDash(clean(p.texto)) };
    // Exemplos da voz entram com a data do rascunho (sempre na janela de comparação).
    const voz = examples.map((e) => ({ ...e, date: r.date }));
    return { draft, hits: sim.similarToDraft(ix, draft, accepted.concat(voz)) };
  };
  const ordered = results.slice().sort((a, b) => a.date.localeCompare(b.date));
  const toRedo = [];
  for (const r of ordered) {
    const flagged = [];
    r.posts.forEach((p, i) => {
      if (!r.slots[i] || !p || !clean(p.texto)) return;
      const c = check(r, i);
      if (c.hits.length) flagged.push({ i, time: r.slots[i].time, hits: c.hits }); else accepted.push(c.draft);
    });
    if (flagged.length) toRedo.push({ r, flagged });
  }
  if (toRedo.length && Date.now() - startedAt < 70000) {
    await Promise.all(toRedo.map(async ({ r, flagged }) => {
      try {
        const slots2 = flagged.map((f) => r.slots[f.i]);
        const note = [weeklyNote(profile, r.date, corpus), retryNote(flagged)].filter(Boolean).join('\n\n');
        const posts2 = await callOpenAI(system, userPrompt(profile, r.date, slots2, r.recent, note));
        flagged.forEach((f, k) => { if (posts2[k] && clean(posts2[k].texto)) { r.posts[f.i] = posts2[k]; stats.reescritos++; } });
      } catch (e) { /* mantém o rascunho original */ }
    }));
  }
  for (const { r, flagged } of toRedo) {
    flagged.forEach((f) => {
      const c = check(r, f.i);
      if (c.hits.some((h) => h.why === 'semanal')) { r.posts[f.i] = null; stats.descartados++; return; }
      if (c.hits.length) stats.parecidosMantidos++;
      accepted.push(c.draft);
    });
  }

  results.forEach(({ date, slots, posts }) => {
    let n = 1;
    slots.forEach((slot, i) => {
      if (!posts[i] || !clean(posts[i].texto)) return;
      const used = new Set(keptCards.map(c => c.id));
      while (used.has(`au_${profile}_${date.replace(/-/g, '')}_${n}`) || deleted.has(`au_${profile}_${date.replace(/-/g, '')}_${n}`)) n++;
      const card = buildCard(profile, date, slot, n, posts[i]);
      // Produto do catálogo real: o gerador de imagem usa para anexar a foto certa.
      const prod = clean(posts[i].produto);
      if (prod && catalogNames.has(prod.toLowerCase())) card.produto = prod;
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
  return { profile, created: created.length, ids: created.map(c => c.id), antiRepeticao: stats, voz: !!loadVoice(profile),
    catalogo: extra.catalog.length || undefined, dadosReais: !!live };
}

// Diagnóstico sem efeito colateral: o deploy enxerga o CONTEXTO.md e os voice.md? (só tamanhos)
function filesCheck() {
  let contexto = 0;
  try { contexto = loadContext().length; } catch (e) { /* 0 = não achou */ }
  const voz = {};
  PROFILES.forEach(p => { voz[p] = loadVoice(p).length; });
  return { contexto, voz };
}

module.exports = async (req, res) => {
  if (req.method === 'GET' && req.query && req.query.check === 'voz') {
    const out = filesCheck();
    try {
      const rows = await readRows();
      out.dados = {};
      ['dados_gymfit', 'dados_gympulse_planeta', 'dados_gympulse_plataforma'].forEach(k => { out.dados[k] = rows[k] ? rows[k].atualizado_em : null; });
    } catch (e) { out.dados = 'erro ao ler: ' + e.message; }
    res.status(200).json(out);
    return;
  }
  const bearer = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const isCron = !!(process.env.CRON_SECRET && bearer === process.env.CRON_SECRET)
    || !!(process.env.AUTO_PUBLISH_SECRET && req.headers['x-auto-publish-secret'] === process.env.AUTO_PUBLISH_SECRET);
  const looksLikeVercelCron = req.method === 'GET' && /vercel-cron/i.test(req.headers['user-agent'] || '');

  try {
    let body = req.body || {};
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }

    if (req.method === 'POST' && body.acao === 'tema') { await temaHandler(req, res, body); return; }

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
      try { out.push(await runProfile(profile, rows, now, now)); }
      catch (e) { out.push({ profile, error: e.message }); }
    }
    await writeRow('auto_state', state);
    res.status(200).json({ ok: true, results: out });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// Para os testes (test/tema-post.test.js).
module.exports._tema = { temaHandler, temaOutputRules, temaFields, recentForTema, systemPrompt, AUTO_OUTPUT_RULES };
