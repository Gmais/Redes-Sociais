// Gera a imagem de um post com IA usando o logo e o mascote da marca como
// imagens de referência, pra que apareçam SEMPRE na arte.
//
// Provedores (chaves ficam só aqui no backend, nunca no navegador):
//   1) Gemini (Nano Banana Pro) — usado quando GEMINI_API_KEY existe. Melhor
//      em design com texto e em manter logo/mascote fiéis.
//   2) OpenAI gpt-image-1 — reserva, quando só OPENAI_API_KEY existe.
//
// Referências (logo obrigatório, mascote opcional) são anexadas pelo próprio
// painel, na janela "Gerar imagem", e ficam no Supabase (linhas
// brand_<perfil>_logo / brand_<perfil>_mascote da tabela painel_gilson_state).
// Fallback: arquivos assets/marcas/<perfil>/logo.png e mascote.png no repo.
// <perfil> = academia | sorveteria | gympulse.

const fs = require('fs');
const path = require('path');

const PROFILES = {
  academia: { nome: 'Academia Planeta Corpo' },
  sorveteria: { nome: 'Sorveteria Guri' },
  gympulse: { nome: 'GympulsePro' }
};

const OPENAI_URL = 'https://api.openai.com/v1';
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/interactions';
const SUPABASE_URL = 'https://ggphrgfgckpsspbsguhp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdncGhyZ2ZnY2twc3NwYnNndWhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3NzE2NDUsImV4cCI6MjEwNDM0NzY0NX0.t_dF5I6c0wCBqOnJd6ko6Jpu_ZQyQ5ulA8buRYLAMMk';

// Logo/mascote anexados no painel (Supabase).
async function loadBrandFromSupabase(profile) {
  const out = {};
  try {
    const keys = ['brand_' + profile + '_logo', 'brand_' + profile + '_mascote'];
    const r = await fetch(`${SUPABASE_URL}/rest/v1/painel_gilson_state?key=in.(${keys.join(',')})&select=key,value`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    if (!r.ok) return out;
    const rows = await r.json();
    rows.forEach((row) => {
      if (!row.value || !row.value.data) return;
      const kind = row.key.endsWith('_logo') ? 'logo' : 'mascote';
      out[kind] = {
        buffer: Buffer.from(row.value.data, 'base64'),
        mime: row.value.mime || 'image/png',
        fileName: kind + '.png'
      };
    });
  } catch (e) { /* cai no fallback do repositório */ }
  return out;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function loadRef(profile, name) {
  const dir = path.join(process.cwd(), 'assets', 'marcas', profile);
  for (const ext of ['png', 'jpg', 'jpeg', 'webp']) {
    const file = path.join(dir, name + '.' + ext);
    if (fs.existsSync(file)) {
      const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
      return { buffer: fs.readFileSync(file), mime, fileName: name + '.' + ext };
    }
  }
  return null;
}

// Procura, em qualquer lugar da resposta, um bloco de imagem com base64 —
// robusto a variações de formato entre versões da API do Gemini.
function findImageData(node) {
  if (!node || typeof node !== 'object') return null;
  if (typeof node.data === 'string' && node.data.length > 1000 &&
      (node.type === 'image' || /^image\//.test(node.mime_type || node.mimeType || ''))) {
    return { b64: node.data, mime: node.mime_type || node.mimeType || 'image/jpeg' };
  }
  if (node.inlineData && typeof node.inlineData.data === 'string') {
    return { b64: node.inlineData.data, mime: node.inlineData.mimeType || 'image/jpeg' };
  }
  if (node.inline_data && typeof node.inline_data.data === 'string') {
    return { b64: node.inline_data.data, mime: node.inline_data.mime_type || 'image/jpeg' };
  }
  for (const k of Object.keys(node)) {
    const found = findImageData(node[k]);
    if (found) return found;
  }
  return null;
}

// A função do Vercel (plano Hobby) é cortada em 60s, então o modelo padrão é o
// rápido (Nano Banana 2.1). O Pro (gemini-3-pro-image) é mais caprichado, mas
// costuma passar de 60s — só use via variável GEMINI_IMAGE_MODEL no Vercel.
const DEADLINE_MS = 52000;

async function generateWithGemini({ apiKey, prompt, refs, aspect }) {
  const started = Date.now();
  const models = [...new Set([process.env.GEMINI_IMAGE_MODEL, 'gemini-nano-banana-2.1', 'gemini-3.1-flash-image'].filter(Boolean))];
  // Do melhor pro mais simples: 2K com proporção -> proporção -> sem opções.
  const variants = [
    { aspect, size: '2K' },
    { aspect, size: null },
    { aspect: null, size: null }
  ];
  let lastError = 'sem resposta';

  for (const model of models) {
    for (const v of variants) {
      const responseFormat = { type: 'image', mime_type: 'image/jpeg' };
      if (v.aspect) responseFormat.aspect_ratio = v.aspect;
      if (v.size) responseFormat.image_size = v.size;

      const input = [{ type: 'text', text: prompt }];
      refs.forEach((r) => input.push({ type: 'image', mime_type: r.mime, data: r.buffer.toString('base64') }));

      const remaining = DEADLINE_MS - (Date.now() - started);
      if (remaining < 4000) throw new Error('a IA demorou demais (limite de 60s do servidor). Tente de novo ou simplifique a descrição.');
      let r;
      try {
        r = await fetch(GEMINI_URL, {
          method: 'POST',
          headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, input, response_format: responseFormat }),
          signal: AbortSignal.timeout(remaining)
        });
      } catch (e) {
        if (e && (e.name === 'TimeoutError' || e.name === 'AbortError')) {
          throw new Error('a IA demorou demais (limite de 60s do servidor). Tente de novo ou simplifique a descrição.');
        }
        throw e;
      }
      let data = {};
      try { data = await r.json(); } catch (e) { /* corpo não-JSON */ }

      if (r.ok) {
        const img = findImageData(data);
        if (img) return { ...img, model };
        lastError = 'a IA respondeu sem imagem';
        continue;
      }
      lastError = (data.error && (data.error.message || JSON.stringify(data.error))) || ('status ' + r.status);
      // 4xx = pedido recusado (modelo/opção inválidos): tenta a próxima variante.
      // 5xx/429 = problema do lado do Google: não adianta insistir.
      if (r.status >= 500 || r.status === 429 || r.status === 401 || r.status === 403) {
        throw new Error(lastError);
      }
    }
  }
  throw new Error(lastError);
}

async function generateWithOpenAI({ apiKey, prompt, refs }) {
  const form = new FormData();
  form.append('model', 'gpt-image-1');
  form.append('prompt', prompt);
  form.append('size', '1024x1536');
  form.append('quality', 'high');
  form.append('output_format', 'jpeg');
  form.append('n', '1');
  refs.forEach((r) => {
    form.append('image[]', new Blob([r.buffer], { type: r.mime }), r.fileName);
  });

  const aiRes = await fetch(OPENAI_URL + '/images/edits', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + apiKey },
    body: form
  });
  const data = await aiRes.json();
  if (!aiRes.ok) {
    throw new Error((data && data.error && data.error.message) || JSON.stringify(data));
  }
  const b64 = data.data && data.data[0] && data.data[0].b64_json;
  if (!b64) throw new Error('a IA não devolveu imagem');
  return { b64, mime: 'image/jpeg', model: 'gpt-image-1' };
}

function buildPrompt({ cfg, isFeed, mascot, palette, title, caption, brief }) {
  const lines = [
    'Você é um diretor de arte sênior de social media. Crie a ARTE FINAL, pronta para publicar, de ' +
      (isFeed ? 'um post de feed do Instagram (vertical 4:5)' : 'um story do Instagram (vertical 9:16)') +
      ' da marca "' + cfg.nome + '".',
    '',
    'Qualidade esperada:',
    '- Composição completa e profissional, com ponto focal forte, iluminação realista e acabamento de agência. NÃO entregue mockup cru, wireframe, fundo liso ou slide genérico.',
    '- Use fotografia realista de alta qualidade ou ilustração/3D polida, conforme o briefing. Cores vivas e contraste alto, legível no celular.',
    '- Inclua um título curto e chamativo em português do Brasil (no máximo 6 palavras), tirado do tema do post, com tipografia forte e legível. Todo texto deve estar escrito corretamente, sem letras inventadas.',
    '- Margens: deixe pelo menos 8% de espaço livre nas laterais, e nenhum texto pode encostar nas bordas nem ser cortado. Quebre o título em linhas menores se precisar.',
    '- Sem marcas d\'água, sem logos de terceiros, sem interface de aplicativo inventada.',
    '',
    'Marca:',
    '- A PRIMEIRA imagem de referência é o LOGO oficial: coloque-o UMA ÚNICA vez, bem visível (rodapé ou canto), IDÊNTICO ao original — mesmas formas, cores e letras, sem redesenhar nem distorcer. Não repita o símbolo do logo como elemento decorativo em outro lugar da arte.',
    mascot ? '- A SEGUNDA imagem de referência é o MASCOTE oficial: inclua-o na cena, fiel ao original (mesmo personagem, proporções e cores).' : null,
    palette ? '- Paleta oficial: ' + palette + '. Não use cores fora dela.' : null,
    isFeed
      ? '- Mantenha tudo que é importante dentro da área central: as bordas de cima e de baixo podem ser cortadas.'
      : '- Deixe margem segura no topo e na base (a interface do Instagram cobre essas áreas).',
    '',
    title ? 'Tema do post: ' + title : null,
    caption ? 'Legenda do post (contexto, não precisa copiar na arte): ' + caption : null,
    '',
    'Briefing da arte:',
    brief
  ];
  return lines.filter((l) => l !== null).join('\n').replace(/\n{3,}/g, '\n\n');
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido' });
    return;
  }

  try {
    const { profile, prompt, format, palette, includeMascot, title, texto } = JSON.parse(await readBody(req));

    const cfg = PROFILES[profile];
    if (!cfg) {
      res.status(400).json({ error: 'Perfil inválido: ' + profile });
      return;
    }
    if (!prompt || !String(prompt).trim()) {
      res.status(400).json({ error: 'Descrição da imagem ausente.' });
      return;
    }
    const geminiKey = process.env.GEMINI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!geminiKey && !openaiKey) {
      res.status(500).json({ error: 'Nenhuma chave de IA configurada no Vercel (GEMINI_API_KEY ou OPENAI_API_KEY).' });
      return;
    }

    const brand = await loadBrandFromSupabase(profile);
    const logo = brand.logo || loadRef(profile, 'logo');
    if (!logo) {
      res.status(400).json({ error: 'Logo de ' + cfg.nome + ' não encontrado. Anexe o logo na janela "Gerar imagem" (seção Logos e mascotes).' });
      return;
    }
    const mascot = includeMascot ? (brand.mascote || loadRef(profile, 'mascote')) : null;

    const isFeed = String(format || '').toLowerCase() === 'post';
    const refs = [logo];
    if (mascot) refs.push(mascot);

    const fullPrompt = buildPrompt({
      cfg, isFeed, mascot: !!mascot, palette,
      title: title ? String(title).slice(0, 200) : '',
      caption: texto ? String(texto).slice(0, 600) : '',
      brief: String(prompt).trim()
    });

    let result, provider;
    try {
      if (geminiKey) {
        provider = 'gemini';
        result = await generateWithGemini({ apiKey: geminiKey, prompt: fullPrompt, refs, aspect: isFeed ? '4:5' : '9:16' });
      } else {
        provider = 'openai';
        result = await generateWithOpenAI({ apiKey: openaiKey, prompt: fullPrompt, refs });
      }
    } catch (e) {
      // Gemini falhou e existe reserva: tenta a OpenAI antes de desistir.
      if (provider === 'gemini' && openaiKey) {
        try {
          provider = 'openai';
          result = await generateWithOpenAI({ apiKey: openaiKey, prompt: fullPrompt, refs });
        } catch (e2) {
          res.status(502).json({ error: 'A IA recusou o pedido: ' + e.message + ' | reserva: ' + e2.message });
          return;
        }
      } else {
        res.status(502).json({ error: 'A IA recusou o pedido: ' + e.message });
        return;
      }
    }

    if (result.b64.length > 4200000) {
      res.status(502).json({ error: 'A imagem gerada ficou grande demais para enviar (' + Math.round(result.b64.length / 1048576) + ' MB). Gere de novo.' });
      return;
    }
    res.status(200).json({
      ok: true, imageBase64: result.b64, mime: result.mime,
      usedLogo: true, usedMascot: !!mascot, provider, model: result.model
    });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Erro inesperado ao gerar a imagem.' });
  }
};

module.exports.buildPrompt = buildPrompt;
module.exports.findImageData = findImageData;
module.exports.generateWithGemini = generateWithGemini;
