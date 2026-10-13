// Gera o card "Ranking do dia" (Story 1080x1920, PNG) a partir do JSON que o
// Gympulse exporta. O desenho espelha o card compartilhavel do app
// (RankingShareModal do Gympulse): mesmos 5 temas, podio top 3 + lista 4o-10o.
//
// satori (JSX-like -> SVG, texto vira path) + resvg (SVG -> PNG). Fonte Inter
// (OFL) fica em assets/fonts; emojis vem do Twemoji (CDN) e, se a CDN falhar,
// o emoji simplesmente fica em branco em vez de derrubar a publicacao.

const fs = require('fs');
const path = require('path');

const W = 1080;
const H = 1920;
const K = W / 380; // unidade "logica" do card do app -> pixel do Story
const px = (n) => Math.round(n * K * 100) / 100;

// Margens de seguranca do Story: o Instagram cobre o topo (barra de progresso +
// perfil) e a base (caixa de resposta). Conteudo importante fica fora delas.
const SAFE_TOP = 68;
const SAFE_BOTTOM = 30;

const THEMES = {
  gold: {
    name: 'Classico',
    bg: '#fafafa',
    periodColor: '#d97706', labelColor: '#9ca3af', dateColor: '#6b7280',
    podiumBg: 'linear-gradient(160deg, #fffbeb 0%, #fef3c7 55%, #fafafa 100%)',
    ring1: 'linear-gradient(135deg, #fde68a, #f59e0b)',
    ring2: 'linear-gradient(135deg, #e2e8f0, #94a3b8)',
    ring3: 'linear-gradient(135deg, #fed7aa, #ea580c)',
    halo1: 'rgba(251,191,36,0.30)', halo2: 'rgba(148,163,184,0.18)', halo3: 'rgba(234,88,12,0.14)',
    badge1Bg: '#f59e0b', badge1Text: '#78350f',
    badge2Bg: '#94a3b8', badge2Text: '#ffffff',
    badge3Bg: '#b45309', badge3Text: '#ffffff',
    nameColor1: '#111827', nameColor2: '#374151', nameColor3: '#374151',
    scorePrimary: '#d97706', scoreSub: '#9ca3af',
    itemBg: '#ffffff', itemBorder: '#e5e7eb',
    itemRank: '#d97706', itemName: '#111827', itemSub: '#9ca3af', itemScore: '#111827',
    dividerColor: 'rgba(0,0,0,0.06)',
    brandPrimary: '#111827', brandSub: '#9ca3af', brandLine: 'rgba(0,0,0,0.08)',
    dec1: 'rgba(251,191,36,0.20)', dec2: 'rgba(245,158,11,0.12)',
  },
  dark: {
    name: 'Dark',
    bg: '#09090b',
    periodColor: '#fbbf24', labelColor: 'rgba(255,255,255,0.35)', dateColor: 'rgba(255,255,255,0.5)',
    podiumBg: 'linear-gradient(160deg, #1c1917 0%, #18181b 55%, #09090b 100%)',
    ring1: 'linear-gradient(135deg, #fde68a, #fbbf24)',
    ring2: 'linear-gradient(135deg, #52525b, #3f3f46)',
    ring3: 'linear-gradient(135deg, #f97316, #c2410c)',
    halo1: 'rgba(251,191,36,0.16)', halo2: 'rgba(82,82,91,0.12)', halo3: 'rgba(249,115,22,0.12)',
    badge1Bg: '#fbbf24', badge1Text: '#78350f',
    badge2Bg: '#3f3f46', badge2Text: '#a1a1aa',
    badge3Bg: '#92400e', badge3Text: '#fde68a',
    nameColor1: '#f4f4f5', nameColor2: '#d4d4d8', nameColor3: '#d4d4d8',
    scorePrimary: '#fbbf24', scoreSub: '#71717a',
    itemBg: '#18181b', itemBorder: '#27272a',
    itemRank: '#fbbf24', itemName: '#f4f4f5', itemSub: '#71717a', itemScore: '#fbbf24',
    dividerColor: 'rgba(255,255,255,0.05)',
    brandPrimary: '#f4f4f5', brandSub: '#52525b', brandLine: 'rgba(255,255,255,0.06)',
    dec1: 'rgba(251,191,36,0.08)', dec2: 'rgba(161,161,170,0.06)',
  },
  neon: {
    name: 'Neon',
    bg: '#020617',
    periodColor: '#22d3ee', labelColor: 'rgba(255,255,255,0.35)', dateColor: 'rgba(255,255,255,0.5)',
    podiumBg: 'linear-gradient(160deg, #0f172a 0%, #0c1a2e 55%, #020617 100%)',
    ring1: 'linear-gradient(135deg, #67e8f9, #06b6d4)',
    ring2: 'linear-gradient(135deg, #0891b2, #0e7490)',
    ring3: 'linear-gradient(135deg, #22d3ee, #0284c7)',
    halo1: 'rgba(6,182,212,0.26)', halo2: 'rgba(14,165,233,0.16)', halo3: 'rgba(8,145,178,0.16)',
    badge1Bg: '#06b6d4', badge1Text: '#083344',
    badge2Bg: '#0e7490', badge2Text: '#cffafe',
    badge3Bg: '#164e63', badge3Text: '#67e8f9',
    nameColor1: '#f0f9ff', nameColor2: '#e0f2fe', nameColor3: '#e0f2fe',
    scorePrimary: '#22d3ee', scoreSub: '#475569',
    itemBg: 'rgba(6,182,212,0.06)', itemBorder: 'rgba(6,182,212,0.15)',
    itemRank: '#22d3ee', itemName: '#f0f9ff', itemSub: '#475569', itemScore: '#22d3ee',
    dividerColor: 'rgba(6,182,212,0.08)',
    brandPrimary: '#f0f9ff', brandSub: '#334155', brandLine: 'rgba(6,182,212,0.1)',
    dec1: 'rgba(6,182,212,0.12)', dec2: 'rgba(14,165,233,0.08)',
  },
  orange: {
    name: 'Neon Laranja',
    bg: '#0c0a00',
    periodColor: '#fb923c', labelColor: 'rgba(255,255,255,0.35)', dateColor: 'rgba(255,255,255,0.5)',
    podiumBg: 'linear-gradient(160deg, #1c0f00 0%, #180d00 55%, #0c0a00 100%)',
    ring1: 'linear-gradient(135deg, #fdba74, #f97316)',
    ring2: 'linear-gradient(135deg, #c2410c, #9a3412)',
    ring3: 'linear-gradient(135deg, #fb923c, #ea580c)',
    halo1: 'rgba(249,115,22,0.30)', halo2: 'rgba(194,65,12,0.18)', halo3: 'rgba(234,88,12,0.18)',
    badge1Bg: '#f97316', badge1Text: '#431407',
    badge2Bg: '#9a3412', badge2Text: '#fed7aa',
    badge3Bg: '#7c2d12', badge3Text: '#fdba74',
    nameColor1: '#fff7ed', nameColor2: '#fed7aa', nameColor3: '#fed7aa',
    scorePrimary: '#fb923c', scoreSub: '#57534e',
    itemBg: 'rgba(249,115,22,0.07)', itemBorder: 'rgba(249,115,22,0.18)',
    itemRank: '#fb923c', itemName: '#fff7ed', itemSub: '#57534e', itemScore: '#fb923c',
    dividerColor: 'rgba(249,115,22,0.09)',
    brandPrimary: '#fff7ed', brandSub: '#44403c', brandLine: 'rgba(249,115,22,0.12)',
    dec1: 'rgba(249,115,22,0.14)', dec2: 'rgba(234,88,12,0.09)',
  },
  purple: {
    name: 'Neon Roxo',
    bg: '#050010',
    periodColor: '#c084fc', labelColor: 'rgba(255,255,255,0.35)', dateColor: 'rgba(255,255,255,0.5)',
    podiumBg: 'linear-gradient(160deg, #130024 0%, #0f001e 55%, #050010 100%)',
    ring1: 'linear-gradient(135deg, #e879f9, #a855f7)',
    ring2: 'linear-gradient(135deg, #7e22ce, #6b21a8)',
    ring3: 'linear-gradient(135deg, #c084fc, #9333ea)',
    halo1: 'rgba(168,85,247,0.30)', halo2: 'rgba(126,34,206,0.18)', halo3: 'rgba(147,51,234,0.18)',
    badge1Bg: '#a855f7', badge1Text: '#2e1065',
    badge2Bg: '#6b21a8', badge2Text: '#f3e8ff',
    badge3Bg: '#581c87', badge3Text: '#e879f9',
    nameColor1: '#faf5ff', nameColor2: '#f3e8ff', nameColor3: '#f3e8ff',
    scorePrimary: '#c084fc', scoreSub: '#4c1d95',
    itemBg: 'rgba(168,85,247,0.07)', itemBorder: 'rgba(168,85,247,0.18)',
    itemRank: '#c084fc', itemName: '#faf5ff', itemSub: '#4c1d95', itemScore: '#c084fc',
    dividerColor: 'rgba(168,85,247,0.09)',
    brandPrimary: '#faf5ff', brandSub: '#3b0764', brandLine: 'rgba(168,85,247,0.12)',
    dec1: 'rgba(168,85,247,0.14)', dec2: 'rgba(147,51,234,0.09)',
  },
  pink: {
    name: 'Neon Rosa',
    bg: '#190010',
    periodColor: '#f472b6', labelColor: 'rgba(255,255,255,0.35)', dateColor: 'rgba(255,255,255,0.5)',
    podiumBg: 'linear-gradient(160deg, #2b0019 0%, #220014 55%, #190010 100%)',
    ring1: 'linear-gradient(135deg, #fbcfe8, #ec4899)',
    ring2: 'linear-gradient(135deg, #be185d, #9d174d)',
    ring3: 'linear-gradient(135deg, #f472b6, #db2777)',
    halo1: 'rgba(236,72,153,0.30)', halo2: 'rgba(190,24,93,0.18)', halo3: 'rgba(219,39,119,0.18)',
    badge1Bg: '#ec4899', badge1Text: '#500724',
    badge2Bg: '#9d174d', badge2Text: '#fce7f3',
    badge3Bg: '#831843', badge3Text: '#f9a8d4',
    nameColor1: '#fdf2f8', nameColor2: '#fce7f3', nameColor3: '#fce7f3',
    scorePrimary: '#f472b6', scoreSub: '#831843',
    itemBg: 'rgba(236,72,153,0.07)', itemBorder: 'rgba(236,72,153,0.18)',
    itemRank: '#f472b6', itemName: '#fdf2f8', itemSub: '#831843', itemScore: '#f472b6',
    dividerColor: 'rgba(236,72,153,0.09)',
    brandPrimary: '#fdf2f8', brandSub: '#831843', brandLine: 'rgba(236,72,153,0.12)',
    dec1: 'rgba(236,72,153,0.14)', dec2: 'rgba(219,39,119,0.09)',
  },
};

// ── fontes ────────────────────────────────────────────────────────────────
let fontsCache = null;
function loadFonts() {
  if (!fontsCache) {
    const dir = path.join(process.cwd(), 'assets', 'fonts');
    const read = (f) => fs.readFileSync(path.join(dir, f));
    // O app carrega Inter ate o peso 700; o "900" do CSS cai no 700 no navegador.
    fontsCache = [
      { name: 'Inter', data: read('inter-latin-400-normal.woff'), weight: 400, style: 'normal' },
      { name: 'Inter', data: read('inter-latin-700-normal.woff'), weight: 700, style: 'normal' },
    ];
  }
  return fontsCache;
}

// ── emoji (Twemoji) ───────────────────────────────────────────────────────
const emojiCache = new Map();
function emojiCode(segment) {
  const s = segment.indexOf('‍') < 0 ? segment.replace(/️/g, '') : segment;
  const out = [];
  for (const ch of s) out.push(ch.codePointAt(0).toString(16));
  return out.join('-');
}
async function loadEmoji(segment) {
  const code = emojiCode(segment);
  if (emojiCache.has(code)) return emojiCache.get(code);
  let uri = '';
  try {
    const res = await fetch(`https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${code}.svg`);
    if (res.ok) uri = 'data:image/svg+xml;base64,' + Buffer.from(await res.text()).toString('base64');
  } catch (e) { /* emoji em branco, nao derruba o card */ }
  if (uri) emojiCache.set(code, uri);
  return uri;
}

// ── avatares ──────────────────────────────────────────────────────────────
function imageSize(buf, type) {
  try {
    if (type === 'image/png') return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
    if (type === 'image/jpeg') {
      let i = 2;
      while (i < buf.length) {
        if (buf[i] !== 0xff) { i++; continue; }
        const marker = buf[i + 1];
        if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
          return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
        }
        i += 2 + buf.readUInt16BE(i + 2);
      }
    }
  } catch (e) { /* tamanho desconhecido: assume quadrado */ }
  return { w: 1, h: 1 };
}

const avatarCache = new Map();
async function loadAvatar(url) {
  if (!url) return null;
  if (avatarCache.has(url)) return avatarCache.get(url);
  let out = null;
  try {
    const res = await fetch(url);
    if (res.ok) {
      let type = (res.headers.get('content-type') || 'image/png').split(';')[0];
      if (type === 'image/jpg') type = 'image/jpeg';
      if (type === 'image/png' || type === 'image/jpeg') {
        const buf = Buffer.from(await res.arrayBuffer());
        out = { uri: `data:${type};base64,` + buf.toString('base64'), ...imageSize(buf, type) };
      }
    }
  } catch (e) { /* cai na inicial colorida */ }
  avatarCache.set(url, out);
  return out;
}

// ── helpers de elemento ───────────────────────────────────────────────────
const el = (type, style, children) => ({
  type,
  props: { style: { display: 'flex', ...style }, ...(children === undefined ? {} : { children }) },
});
const text = (style, str) => ({ type: 'div', props: { style: { display: 'flex', ...style }, children: String(str) } });

// avatar do app: 'hsl(280, 80%, 55%)' -> hex (satori nao garante hsl())
function toHex(color) {
  const m = /^hsl\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*\)$/i.exec(color || '');
  if (!m) return /^#|^rgb/.test(color || '') ? color : '#3f3f46';
  const h = Number(m[1]), s = Number(m[2]) / 100, l = Number(m[3]) / 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
    return Math.round(255 * c).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

// Circulo do avatar. Foto: <img> dimensionada para "cobrir" o circulo (object-fit: cover
// do app) e centralizada; sem foto: inicial do nome sobre a cor do aluno. A "borda" e um
// disco de fundo com padding, nao um border CSS (o clip do satori nao respeita border).
function avatar(student, size, borderWidth, borderColor) {
  const outer = px(size);
  const bw = px(borderWidth);
  const inner = outer - 2 * bw;
  const a = student._avatar;
  const disc = { width: inner, height: inner, borderRadius: 9999, overflow: 'hidden', position: 'relative', alignItems: 'center', justifyContent: 'center' };
  let content;
  if (a) {
    const scale = Math.max(inner / a.w, inner / a.h);
    const w = a.w * scale, h = a.h * scale;
    content = el('div', disc, {
      type: 'img',
      props: { src: a.uri, width: w, height: h, style: { position: 'absolute', left: (inner - w) / 2, top: (inner - h) / 2, width: w, height: h } },
    });
  } else {
    content = el('div', { ...disc, backgroundColor: toHex(student.avatarColor) },
      text({ fontSize: px(size * 0.4), fontWeight: 700, color: '#ffffff' }, (student.name || '?').charAt(0).toUpperCase()));
  }
  return el('div', { width: outer, height: outer, borderRadius: 9999, backgroundColor: borderColor, padding: bw }, content);
}

function podiumEntry(student, rank, t) {
  const first = rank === 1;
  const ringSize = first ? 90 : rank === 2 ? 72 : 66;
  const ringPad = first ? 4 : 3;
  const ring = t['ring' + rank];
  const halo = t['halo' + rank];
  const badgeBg = t['badge' + rank + 'Bg'];
  const badgeText = t['badge' + rank + 'Text'];
  const nameColor = t['nameColor' + rank];
  const badgeSize = first ? 28 : 24;
  const innerSize = ringSize - ringPad * 2;

  const badge = el('div', {
    width: px(badgeSize), height: px(badgeSize), borderRadius: 9999,
    backgroundColor: badgeBg, color: badgeText, alignItems: 'center', justifyContent: 'center',
    fontSize: px(first ? 12 : 10), fontWeight: 700, border: `${px(first ? 3 : 2)}px solid ${t.bg}`,
  }, String(rank));

  return el('div', {
    flex: 1, flexDirection: 'column', alignItems: 'center',
    ...(first ? { transform: `translateY(${px(-18)}px)` } : {}),
  }, [
    // coroa do 1o (no app e absoluta; aqui entra no fluxo, colada no topo do anel)
    first ? text({ fontSize: px(18), height: px(18), marginBottom: px(-4), alignItems: 'flex-end' }, '👑') : null,
    // coluna do avatar: o anel define a largura; o brilho (halo) fica atras
    el('div', { flexDirection: 'column', alignItems: 'center', position: 'relative' }, [
      el('div', {
        position: 'absolute', top: px(-ringSize * 0.35), left: px(-ringSize * 0.35),
        width: px(ringSize * 1.7), height: px(ringSize * 1.7), borderRadius: 9999,
        backgroundImage: `radial-gradient(circle, ${halo} 0%, rgba(0,0,0,0) 65%)`,
      }),
      el('div', {
        width: px(ringSize), height: px(ringSize), borderRadius: 9999, padding: px(ringPad), backgroundImage: ring,
      }, avatar(student, innerSize, first ? 3 : 2, t.bg)),
      // selo da posicao: 1o centralizado, 2o/3o no canto inferior direito
      el('div', {
        width: px(ringSize), marginTop: px(-badgeSize * 0.55), marginBottom: px(first ? 6 : 5),
        justifyContent: first ? 'center' : 'flex-end', paddingRight: first ? 0 : px(rank === 2 ? 4 : 1),
      }, badge),
    ]),
    el('div', { flexDirection: 'column', alignItems: 'center', maxWidth: px(first ? 118 : 100) }, [
      text({
        fontSize: px(first ? 14 : 11), fontWeight: 700, color: nameColor, textTransform: 'uppercase',
        letterSpacing: px(0.02 * (first ? 14 : 11)), lineHeight: 1.1, whiteSpace: 'nowrap',
      }, `${student.name} ${student.levelIcon || ''}`.trim()),
      text({ fontSize: px(first ? 16 : 12), fontWeight: 700, color: t.scorePrimary, lineHeight: 1.2, marginTop: px(first ? 3 : 2) },
        `${student.points} PTS`),
      text({ fontSize: px(first ? 9 : 8), color: t.scoreSub, marginTop: px(2), letterSpacing: px(0.04 * 9) },
        `${student.minutes}min · ${student.calories} cal`),
    ]),
  ].filter(Boolean));
}

function leaderRow(student, pos, t, rowPad, avatarSize) {
  return el('div', {
    alignItems: 'center', padding: `${px(rowPad)}px ${px(10)}px ${px(rowPad)}px ${px(8)}px`,
    backgroundColor: t.itemBg, border: `${px(1)}px solid ${t.itemBorder}`, borderRadius: px(12),
  }, [
    el('div', { width: px(22), justifyContent: 'center', flexShrink: 0 },
      text({ fontSize: px(11), fontWeight: 700, color: t.itemRank, transform: 'skewX(-14deg)' }, `${pos}º`)),
    el('div', { marginLeft: px(9), flexShrink: 0 }, avatar(student, avatarSize, 1.5, t.itemBorder)),
    el('div', { flex: 1, flexDirection: 'column', marginLeft: px(9), minWidth: 0 }, [
      text({
        fontSize: px(11), fontWeight: 700, color: t.itemName, textTransform: 'uppercase',
        letterSpacing: px(0.22), lineHeight: 1.2, whiteSpace: 'nowrap',
      }, `${student.name} ${student.levelIcon || ''}`.trim()),
      text({ fontSize: px(8), color: t.itemSub, marginTop: px(1), letterSpacing: px(0.24) },
        `${student.calories} cal · ${student.minutes} min`),
    ]),
    el('div', { alignItems: 'baseline', flexShrink: 0 }, [
      text({ fontSize: px(11), fontWeight: 700, color: t.itemScore }, String(student.points)),
      text({ fontSize: px(8), fontWeight: 700, color: t.itemScore, marginLeft: px(3) }, 'PTS'),
    ]),
  ]);
}

function buildTree(data, t) {
  const top = data.students.slice(0, 10);
  const [s1, s2, s3] = top;
  const others = top.slice(3);
  const gym = String(data.tenant.name || '').toUpperCase();

  // Quanto sobra de altura vira respiro nas linhas da lista (ate um limite)
  const rowPad = others.length >= 7 ? 1.7 : 3.4;
  const avatarSize = others.length >= 7 ? 24 : 28;

  return el('div', {
    width: W, height: H, backgroundColor: t.bg, flexDirection: 'column', position: 'relative', overflow: 'hidden',
    fontFamily: 'Inter',
  }, [
    el('div', { position: 'absolute', top: px(-150), right: px(-150), width: px(430), height: px(430), borderRadius: 9999,
      backgroundImage: `radial-gradient(circle, ${t.dec1} 0%, rgba(0,0,0,0) 70%)` }),
    el('div', { position: 'absolute', bottom: px(-150), left: px(-150), width: px(430), height: px(430), borderRadius: 9999,
      backgroundImage: `radial-gradient(circle, ${t.dec2} 0%, rgba(0,0,0,0) 70%)` }),

    el('div', { flexDirection: 'column', flex: 1, paddingTop: px(SAFE_TOP), paddingBottom: px(SAFE_BOTTOM) }, [
      // cabecalho
      el('div', { flexDirection: 'column', alignItems: 'center', padding: `0 ${px(24)}px` }, [
        el('div', { alignItems: 'center', marginBottom: px(10) }, [
          el('div', { width: px(20), height: px(1.5), borderRadius: 2, backgroundColor: t.periodColor, opacity: 0.4 }),
          text({ fontSize: px(9), fontWeight: 700, letterSpacing: px(2.7), textTransform: 'uppercase', color: t.labelColor, margin: `0 ${px(8)}px` }, gym),
          el('div', { width: px(20), height: px(1.5), borderRadius: 2, backgroundColor: t.periodColor, opacity: 0.4 }),
        ]),
        text({ fontSize: px(10), fontWeight: 700, letterSpacing: px(1.8), textTransform: 'uppercase', color: t.labelColor, marginBottom: px(3) }, 'O Ranking de'),
        el('div', { alignItems: 'center' }, [
          text({ fontSize: px(28), fontWeight: 700, color: t.periodColor, lineHeight: 1, transform: 'skewX(-14deg)', letterSpacing: px(-0.56) }, 'HOJE'),
          text({ fontSize: px(22), marginLeft: px(8) }, '🏆'),
        ]),
        el('div', { alignItems: 'center', marginTop: px(5) }, [
          text({ fontSize: px(10), fontWeight: 700, color: t.dateColor, textTransform: 'uppercase', letterSpacing: px(1.2) }, data.weekdayLabel),
          el('div', { width: px(3), height: px(3), borderRadius: 9999, backgroundColor: t.periodColor, opacity: 0.6, margin: `0 ${px(6)}px` }),
          text({ fontSize: px(10), fontWeight: 700, color: t.periodColor, textTransform: 'uppercase', letterSpacing: px(1) }, data.dateLabel),
        ]),
      ]),

      // podio
      el('div', { backgroundImage: t.podiumBg, padding: `${px(22)}px ${px(8)}px ${px(8)}px`, marginTop: px(10), alignItems: 'flex-end', justifyContent: 'center' },
        [s2 ? podiumEntry(s2, 2, t) : el('div', { flex: 1 }),
         s1 ? podiumEntry(s1, 1, t) : el('div', { flex: 1 }),
         s3 ? podiumEntry(s3, 3, t) : el('div', { flex: 1 })]),

      el('div', { height: px(1), backgroundColor: t.dividerColor, margin: `0 ${px(20)}px` }),

      // 4o a 10o
      el('div', { flex: 1, flexDirection: 'column', padding: `${px(8)}px ${px(14)}px 0` },
        others.map((s, i) => el('div', { flexDirection: 'column', marginTop: i === 0 ? 0 : px(2.2) }, leaderRow(s, i + 4, t, rowPad, avatarSize)))),

      // rodape
      el('div', { flexDirection: 'column', alignItems: 'center', padding: `${px(14)}px ${px(24)}px 0` }, [
        el('div', { height: px(1), width: '100%', backgroundColor: t.brandLine, marginBottom: px(10) }),
        text({ fontSize: px(13), fontWeight: 700, letterSpacing: px(2.6), color: t.brandPrimary, textTransform: 'uppercase', transform: 'skewX(-14deg)' }, gym),
        text({ fontSize: px(8), fontWeight: 700, letterSpacing: px(2.8), textTransform: 'uppercase', color: t.brandSub, marginTop: px(3) }, 'Monitoramento Profissional'),
      ]),
    ]),
  ]);
}

/**
 * @param {object} data payload do Gympulse (ver api/gympulse-ranking.js)
 * @returns {Promise<Buffer>} PNG 1080x1920
 */
async function renderRankingCard(data) {
  const satori = (await import('satori')).default;
  const { Resvg } = require('@resvg/resvg-js');

  const t = THEMES[data.theme] || THEMES.dark;
  const students = data.students.slice(0, 10).map((s) => ({ ...s }));
  await Promise.all(students.map(async (s) => { s._avatar = await loadAvatar(s.avatarUrl); }));

  const svg = await satori(buildTree({ ...data, students }, t), {
    width: W,
    height: H,
    fonts: loadFonts(),
    loadAdditionalAsset: async (code, segment) => (code === 'emoji' ? loadEmoji(segment) : []),
  });
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: W }, font: { loadSystemFonts: false } }).render().asPng();
  return Buffer.from(png);
}

module.exports = { renderRankingCard, THEMES };
