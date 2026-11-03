// Detecta "mensagens parecidas" entre posts da MESMA marca em dias próximos.
//
// Dois sinais (calibrados com o histórico real do painel):
//   - caption: a legenda é parecida (similaridade de cosseno com peso IDF, por radicais
//     de palavras). Pega o mesmo produto/assunto escrito de outro jeito.
//   - tema:    o TÍTULO repete 2+ palavras-chave em até 3 dias (ex.: "Picolé de Uva" de novo).
//     Pega o mesmo assunto mesmo quando a legenda muda quase tudo.
//   - semanal: assunto que o CONTEXTO.md limita a 1x por semana (hoje: Carrinho de Sorvete).
// Posts de encerramento do dia (template fixo por regra) nunca são comparados entre si.
//
// ATENÇÃO: a mesma lógica existe dentro do index.html (bloco "MENSAGENS PARECIDAS"), porque
// o painel é um arquivo estático sem build. test/caption-similarity.test.js confere que as
// duas versões dão o mesmo resultado — mexeu aqui, mexa lá.

const CAPTION_MIN = 0.30;   // cosseno mínimo da legenda
const CAPTION_SHARED = 4;   // e pelo menos N radicais em comum
const WINDOW_DAYS = 7;      // janela de comparação (± dias)
const THEME_DAYS = 3;       // janela do sinal "tema"
const THEME_TERMS = 2;      // palavras-chave de título em comum para o sinal "tema"
const THEME_MIN_CAPTION = 0.15; // e legenda minimamente parecida (evita ruído como "Dica rápida")
// Assuntos de no máximo 1 post por semana (segunda a domingo), por marca. Fonte: CONTEXTO.md.
const ONCE_A_WEEK = [{ profile: 'sorveteria', label: 'Carrinho de Sorvete', re: /carrinho/i }];

const STOP = new Set(('para com uma que dos das nao sem por mais como mas seu sua isso esta este foi ser tem ate ' +
  'sobre entre voce voces vem aqui hoje pra ela ele dia').split(' '));
// Palavras de pilar/formato que aparecem em muitos títulos e não indicam assunto repetido.
const TITLE_STOP = new Set(('produto produtos loja buffet dia hoje encerramento humanizacao destaque sorvete sorvetes ' +
  'caixa especial novo nova sabor sabores dica dicas bastidores agradecimento obrigado noite story post turvo guri ' +
  'planeta corpo academia treino semana fim de da do para pra com sua seu campanha promocao').split(' '));
const TITLE_STOP_STEMS = new Set([...TITLE_STOP].map((w) => w.slice(0, 6))); // os termos comparados são radicais de 6 letras
const TEMPLATE_RE = /encerramento|boa noite|abertura do dia/i;

function stems(text) {
  return String(text || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/#\w+/g, ' ').replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w) && !/^\d+$/.test(w)).map((w) => w.slice(0, 6));
}
function themeStems(title) {
  return stems(title).filter((w) => !TITLE_STOP_STEMS.has(w));
}
function dayOf(date) { return Math.floor(Date.parse(date + 'T00:00:00Z') / 86400000); }

function weekStart(day) { const wd = (day + 4) % 7; return day - ((wd + 6) % 7); } // 1970-01-01 foi quinta

function weekOf(date) { return weekStart(dayOf(date)); }

function prepare(d) {
  const day = dayOf(d.date);
  const hay = (d.title || '') + ' ' + (d.texto || '');
  return {
    id: d.id, profile: d.profile, date: d.date, time: d.time || '', title: d.title || '', texto: d.texto,
    day, week: weekStart(day), once: ONCE_A_WEEK.filter((r) => r.profile === d.profile && r.re.test(hay)).map((r) => r.label), set: new Set(stems(d.texto)), theme: new Set(themeStems(d.title)),
    templ: TEMPLATE_RE.test(d.title || '')
  };
}

function createIndex(docs) {
  const list = docs.filter((d) => d && d.id && d.texto && d.date).map(prepare);
  const df = new Map();
  list.forEach((d) => d.set.forEach((w) => df.set(w, (df.get(w) || 0) + 1)));
  const N = list.length;
  const idf = (w) => Math.log((N + 1) / ((df.get(w) || 0) + 1)) + 0.05; // palavra rara pesa mais
  const norm = (set) => Math.sqrt([...set].reduce((a, w) => a + idf(w) * idf(w), 0)) || 1;
  list.forEach((d) => { d.n = norm(d.set); });
  const byId = new Map(list.map((d) => [d.id, d]));
  return { list, byId, idf, norm };
}

function compare(ix, me, d) {
  if (d.id === me.id || d.profile !== me.profile) return null;
  const gap = Math.abs(d.day - me.day);
  const onceHit = d.week === me.week ? me.once.find((l) => d.once.includes(l)) : null;
  if (onceHit) return { doc: d, score: 1, why: 'semanal', label: onceHit, gap };
  if (gap > WINDOW_DAYS) return null;
  if (d.templ && me.templ) return null;
  let dot = 0, shared = 0;
  me.set.forEach((w) => { if (d.set.has(w)) { dot += ix.idf(w) * ix.idf(w); shared++; } });
  const score = dot / (me.n * d.n);
  if (shared >= CAPTION_SHARED && score >= CAPTION_MIN) return { doc: d, score, why: 'caption', gap };
  if (gap <= THEME_DAYS && !d.templ && !me.templ) {
    const terms = [...me.theme].filter((w) => d.theme.has(w));
    if (terms.length >= THEME_TERMS && score >= THEME_MIN_CAPTION) return { doc: d, score, why: 'tema', terms, gap };
  }
  return null;
}

const RANK = { semanal: 0, caption: 1, tema: 2 };

// Posts parecidos com o post `id` que já está no índice.
function similar(ix, id, opts) {
  const me = ix.byId.get(id);
  if (!me) return [];
  const out = [];
  ix.list.forEach((d) => { const r = compare(ix, me, d); if (r) out.push(r); });
  return out.sort((a, b) => RANK[a.why] - RANK[b.why] || b.score - a.score).slice(0, (opts && opts.limit) || 3);
}

// Rascunho que ainda NÃO está no índice (ex.: post que a IA acabou de escrever).
function similarToDraft(ix, draft, extraDocs) {
  const me = prepare({ id: draft.id || '__draft__', ...draft });
  me.n = ix.norm(me.set);
  const pool = ix.list.concat((extraDocs || []).map((d) => { const p = prepare(d); p.n = ix.norm(p.set); return p; }));
  const out = [];
  pool.forEach((d) => { const r = compare(ix, me, d); if (r) out.push(r); });
  return out.sort((a, b) => RANK[a.why] - RANK[b.why] || b.score - a.score);
}

module.exports = { weekOf, createIndex, similar, similarToDraft, stems, CAPTION_MIN, WINDOW_DAYS, THEME_DAYS, THEME_TERMS, ONCE_A_WEEK, TEMPLATE_RE };
