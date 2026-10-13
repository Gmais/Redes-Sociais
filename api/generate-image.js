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

// style = direção de arte de cada marca (tom, cenário, tratamento de imagem).
const PROFILES = {
  academia: {
    nome: 'Academia Planeta Corpo',
    typo: 'limpa, humana e acolhedora (sans-serif arredondada ou semi-arredondada), em cores claras sobre fundo escuro ou laranja, com UMA palavra-chave em destaque na cor de acento.',
    style: 'Fotografia editorial esportiva REALISTA, luz natural quente e acolhedora, pessoas reais (adultos de 30 a 45 anos, expressões genuínas e sorridentes), ambiente de academia limpo, organizado e bem iluminado. Tom acolhedor e de bem-estar, focado em saúde e rotina — nunca estética agressiva, nada de corpos "perfeitos" de capa de revista, nada intimidador. Cores dominantes: laranja, azul-petróleo, preto e branco.'
  },
  sorveteria: {
    nome: 'Sorveteria Guri',
    typo: 'amigável e divertida (manuscrita/brush ou arredondada bold), título em branco com a parte final em amarelo de destaque e um sublinhado curvo amarelo; linha de apoio menor, também manuscrita.',
    style: 'Estilo festivo, familiar e gostoso: cores quentes e vibrantes, produto super apetitoso (sorvete cremoso, com textura, gotas, brilho e condensação), em close/macro ou como herói grande. Fundo limpo ou ambiente aconchegante de sorveteria, com iluminação suave. Se houver mascote 3D, mantenha o MESMO estilo de render 3D (iluminação, materiais, proporções) no resto da cena, para tudo parecer uma única cena coerente.'
  },
  gympulse: {
    nome: 'GympulsePro',
    typo: 'geométrica sans-serif BOLD, alto contraste, destaque em amarelo, muito espaço negativo ao redor.',
    style: 'B2B tecnológico, premium e minimalista: fundo escuro/preto com detalhes em amarelo, tipografia limpa, formas geométricas sutis e muito espaço negativo. NÃO invente interface de aplicativo, números ou gráficos com texto; se precisar sugerir uma tela, use só formas abstratas (blocos, barras, linhas) sem texto. Se o cliente anexar capturas de tela reais, use-as fielmente.'
  }
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

// Custo por imagem (Google, tabela padrão): nano-banana-2.1 = US$0,034 em 1K e
// US$0,050 em 2K; 3.1-flash-image = US$0,10 em 2K; 3-pro-image = US$0,13 (e
// lento). O 2.1 é o melhor custo-benefício, então é o padrão. Em 2K a arte sai
// nítida pra 1080×1920; GEMINI_IMAGE_SIZE=1K (variável no Vercel) economiza ~33%
// mas deixa o story mais "macio". GEMINI_IMAGE_MODEL troca o modelo (ex.: Pro).
const DEADLINE_MS = 100000; // vercel.json dá 120s à função

async function generateWithGemini({ apiKey, prompt, refs, aspect, premium }) {
  const started = Date.now();
  // Premium = Nano Banana Pro (mais caprichado em composição e texto, ~US$0,13/imagem, mais lento).
  const order = premium
    ? ['gemini-3-pro-image', 'gemini-nano-banana-2.1']
    : ['gemini-nano-banana-2.1', 'gemini-3.1-flash-image'];
  const models = [...new Set([process.env.GEMINI_IMAGE_MODEL, ...order].filter(Boolean))];
  // Do melhor pro mais simples: 2K com proporção -> proporção -> sem opções.
  const size = ['1K', '2K'].includes(process.env.GEMINI_IMAGE_SIZE) ? process.env.GEMINI_IMAGE_SIZE : '2K';
  const variants = [
    { aspect, size },
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
        if (img) {
          console.log('[gemini] ok', model, JSON.stringify(v), (Date.now() - started) + 'ms', 'b64=' + img.b64.length);
          return { ...img, model };
        }
        lastError = 'a IA respondeu sem imagem';
        console.log('[gemini] sem imagem', model, JSON.stringify(v), JSON.stringify(data).slice(0, 400));
        continue;
      }
      lastError = (data.error && (data.error.message || JSON.stringify(data.error))) || ('status ' + r.status);
      console.log('[gemini] erro', model, JSON.stringify(v), r.status, String(lastError).slice(0, 300), (Date.now() - started) + 'ms');
      // 4xx = pedido recusado (modelo/opção inválidos): tenta a próxima variante.
      // 5xx/429 = problema do lado do Google: não adianta insistir.
      if (r.status >= 500 || r.status === 429 || r.status === 401 || r.status === 403) {
        throw new Error(lastError);
      }
    }
  }
  throw new Error(lastError);
}

// OpenAI GPT Image. Com referências (logo, mascote, anexos) usa /images/edits; sem
// nenhuma, /images/generations. Tenta os modelos em ordem (o primeiro que o
// OpenAI aceitar). Tamanhos próprios pro formato do Instagram (múltiplos de 16).
async function generateWithOpenAI({ apiKey, prompt, refs, timeoutMs, isFeed, quality }) {
  const started = Date.now();
  const hasRefs = !!(refs && refs.length);
  // sunburst = melhor em edição com referências (logo/mascote fiéis); flare = rápido no dia a dia.
  const models = [...new Set([process.env.OPENAI_IMAGE_MODEL,
    hasRefs ? 'gpt-image-2.5-sunburst' : 'gpt-image-2.5-flare', 'gpt-image-2.5-flare', 'gpt-image-1'].filter(Boolean))];
  const q = quality || process.env.OPENAI_IMAGE_QUALITY || 'high';
  let lastError = 'sem resposta';

  for (const model of models) {
    const remaining = (timeoutMs || 100000) - (Date.now() - started);
    if (remaining < 5000) throw new Error('a IA demorou demais. Tente de novo ou use o motor Nano Banana (mais rápido).');
    const legacy = model === 'gpt-image-1';
    const size = legacy ? '1024x1536' : (isFeed ? '1088x1360' : '1088x1920');
    const signal = AbortSignal.timeout(remaining);
    let aiRes;
    try {
      if (hasRefs) {
        const form = new FormData();
        form.append('model', model);
        form.append('prompt', prompt);
        form.append('size', size);
        form.append('quality', q);
        form.append('output_format', 'jpeg');
        form.append('n', '1');
        refs.forEach((r) => {
          form.append('image[]', new Blob([r.buffer], { type: r.mime }), r.fileName);
        });
        aiRes = await fetch(OPENAI_URL + '/images/edits', { method: 'POST', headers: { 'Authorization': 'Bearer ' + apiKey }, body: form, signal });
      } else {
        aiRes = await fetch(OPENAI_URL + '/images/generations', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, prompt, size, quality: q, output_format: 'jpeg', n: 1 }),
          signal
        });
      }
    } catch (e) {
      if (e && (e.name === 'TimeoutError' || e.name === 'AbortError')) {
        throw new Error('a IA demorou demais. Tente de novo ou use o motor Nano Banana (mais rápido).');
      }
      throw e;
    }
    let data = {};
    try { data = await aiRes.json(); } catch (e) { /* corpo não-JSON */ }
    if (aiRes.ok) {
      const b64 = data.data && data.data[0] && data.data[0].b64_json;
      if (!b64) { lastError = 'a IA não devolveu imagem'; continue; }
      console.log('[openai] ok', model, size, q, (Date.now() - started) + 'ms', 'b64=' + b64.length);
      return { b64, mime: 'image/jpeg', model };
    }
    lastError = (data && data.error && data.error.message) || ('status ' + aiRes.status);
    console.log('[openai] erro', model, size, aiRes.status, String(lastError).slice(0, 300), (Date.now() - started) + 'ms');
    // chave/cota/tempo: não adianta trocar de modelo. Modelo/tamanho inválido (4xx): tenta o próximo.
    if (aiRes.status === 401 || aiRes.status === 403 || aiRes.status === 429 || aiRes.status >= 500) throw new Error(lastError);
  }
  throw new Error(lastError);
}

// Briefing de direção de arte, em seções. O LOGO NÃO é pedido à IA: o painel o
// aplica por cima, idêntico ao original e uma única vez (modo "painel").
function buildPrompt({ cfg, isFeed, mascot, attachCount, attachUses, palette, title, caption, brief, headline, subline }) {
  // Regras que o card define e a IA costuma ignorar: viram exigências explícitas.
  const mRule = /regra\s*60\s*[-–]\s*30\s*[-–]\s*10\s*:\s*([^\n]+)/i.exec(brief);
  const colorRule = mRule ? mRule[1].trim().replace(/[.;]+$/, '') : '';
  const noCta = /CTA\s*:\s*(nenhum|n[aã]o\s+h[aá]|sem\b)/i.test(brief);
  const lines = [
    'Você é um diretor de arte sênior de agência. Crie a ARTE FINAL, pronta para publicar, de ' +
      (isFeed ? 'um post de feed do Instagram' : 'um story do Instagram') + ' da marca "' + cfg.nome + '". ' +
      'Siga o briefing abaixo à risca, seção por seção.',
    '',
    '[1. FORMATO]',
    isFeed
      ? '- Vertical 4:5 (1080×1350 px). Mantenha tudo que é importante na área central: as bordas de cima e de baixo podem ser cortadas.'
      : '- Vertical 9:16 (1080×1920 px). Deixe margem segura no topo (12%) pois a interface do Instagram cobre essa área.',
    '- ÁREA CALMA PARA O LOGO: deixe pelo menos DUAS regiões calmas — fundo limpo e contínuo, sem texto, sem produto, sem personagem e sem detalhes — cada uma com no mínimo 30% da largura × 10% da altura, em cantos ou na base/topo (onde ficar melhor esteticamente, equilibrando a composição). O logo oficial será aplicado depois, por outro sistema, na região mais limpa.',
    '',
    '[2. LOGO — REGRA CRÍTICA]',
    '- NÃO desenhe, escreva ou imite o logo, o nome da marca, selos ou símbolos de marca em NENHUM lugar da arte. Zero logos. Nenhum elemento decorativo pode lembrar o logo.',
    '',
    '[3. BRIEFING DO CLIENTE — USE TODOS OS BLOCOS]',
    title ? '- Tema do post: ' + title : null,
    '- O texto abaixo traz os blocos do card do post (os que existirem). Leia e aplique TODOS:',
    '  • TEXTO DA POSTAGEM: a legenda que vai junto da imagem. A cena e o título da arte devem comunicar a ideia central dela (não copie o texto inteiro na arte).',
    '  • FORMATO E ESPECIFICAÇÕES: dimensões, proporção e regras de composição (ex.: regra 60-30-10, limite de texto na imagem). Obedeça — têm prioridade sobre os padrões gerais abaixo, EXCETO as regras de LOGO e de ÁREA CALMA PARA O LOGO. Se pedirem um elemento de CTA na arte, inclua-o.',
    '  • INTENÇÃO DA POSTAGEM: tipo, objetivo e CTA. O clima, a hierarquia visual e o destaque da arte devem servir a esse objetivo.',
    '  • BRIEFING CRIATIVO / O QUE A IMAGEM DEVE MOSTRAR: a cena, o estilo e as restrições visuais. Siga com fidelidade.',
    '',
    brief,
    '',
    '[4. TÍTULO NA ARTE]',
    headline
      ? '- Escreva EXATAMENTE este título, sem alterar nenhuma letra, pontuação ou palavra (é a frase do próprio post, não reescreva nem invente outro): "' + headline + '".'
      : '- Crie UM título curto e chamativo em português do Brasil (máximo 6 palavras), usando as PALAVRAS do TEXTO DA POSTAGEM (ou do tema do post, se não houver texto). Não invente um assunto diferente do texto.',
    subline
      ? '- Abaixo do título, em tamanho bem menor (cerca de 1/3 do título), escreva EXATAMENTE esta linha de apoio: "' + subline + '".'
      : null,
    '- Tipografia de impacto: sans-serif condensada e BOLD, em caixa alta, GRANDE (cada linha ocupando cerca de 70–85% da largura útil), no máximo 3 linhas, com contraste forte (letra clara sobre área escura ou o contrário) e leve sombra/contorno para destacar do fundo. Alinhamento consistente (centralizado ou à esquerda), entrelinha justa, posição no terço de cima. Margem lateral mínima de 8%: nenhuma letra pode encostar nas bordas nem ser cortada — quebre em linhas menores se precisar. Pode destacar UMA palavra-chave do título em cor de destaque da paleta.',
    '- Nenhum outro texto na arte além do título (e do que o briefing pedir de forma explícita). Texto escrito corretamente, sem letras inventadas ou erros de ortografia.',
    '',
    '[5. COMPOSIÇÃO]',
    '- Um único ponto focal forte no centro (o produto/assunto "herói"), com primeiro plano, plano médio e fundo bem definidos, profundidade de campo e espaço de respiro ao redor.',
    '- Hierarquia clara: título → elemento herói → (regiões calmas livres para o logo).',
    '- A CENA deve ilustrar a situação descrita no TEXTO DA POSTAGEM (o momento, o clima e o produto citados nele), e o clima deve combinar com a INTENÇÃO DA POSTAGEM.',
    colorRule
      ? '- REGRA DE CORES OBRIGATÓRIA (60-30-10): ' + colorRule + '. Distribua as cores da arte exatamente nessa proporção da área visível. A cor de 30% precisa ser CLARAMENTE visível e marcante (grandes áreas, não só pequenos detalhes) e a cor de 10% aparece só nos textos/acentos. Isso tem prioridade sobre qualquer outra escolha de cor.'
      : null,
    noCta
      ? '- Este post NÃO tem chamada para ação: não inclua botão, seta, "saiba mais", "clique" nem qualquer texto de CTA.'
      : null,
    '',
    '[6. ESTILO E ACABAMENTO]',
    '- Direção de arte da marca: ' + (cfg.style || 'visual profissional e limpo.'),
    '- Acabamento de campanha publicitária premium: iluminação cinematográfica com luz de contorno (rim light), profundidade de campo com fundo levemente desfocado, color grading harmonioso e consistente, texturas realistas, sombras suaves e reflexos naturais. O elemento herói é GRANDE (cerca de 30–45% da altura), nítido e bem iluminado; o resto da cena apoia sem poluir.',
    '- Composição limpa, equilibrada e legível no celular: poucos elementos, bem escolhidos. Evite aspecto "plástico", excesso de brilho/neon, saturação estourada, ruído e objetos aleatórios espalhados. NÃO entregue mockup cru, wireframe, fundo liso ou slide genérico.',
    palette ? '- Paleta oficial da marca: ' + palette + '. Use essas cores como dominantes; não use cores fora dela.' : null
  ];
  if (mascot) {
    lines.push(
      '',
      '[7. MASCOTE]',
      '- A PRIMEIRA imagem de referência é o MASCOTE oficial da marca. Inclua-o UMA única vez, FIEL ao original (mesmo personagem, proporções, roupa e cores — não recrie nem reinterprete), com cerca de 25–35% da altura da arte, interagindo naturalmente com o produto/cena (expressão alegre), nunca cortado pelas bordas e fora das regiões calmas reservadas ao logo.'
    );
  }
  if (attachCount > 0) {
    const first = mascot ? 2 : 1;
    const last = first + attachCount - 1;
    lines.push(
      '',
      '[8. IMAGENS ANEXADAS PELO CLIENTE]',
      '- As imagens de referência ' + first + (last > first ? ' a ' + last : '') + ' são fotos/arte do cliente. Siga a INSTRUÇÃO DE USO de cada uma:',
      ...Array.from({ length: attachCount }, (_, i) => '  • Imagem ' + (first + i) + ': ' + ((attachUses && attachUses[i]) ? attachUses[i] : 'produto em destaque, FIEL ao original (mesma embalagem, rótulo, formato e cores).')),
      '- Quando a instrução for usar como FUNDO, a imagem cobre a arte inteira (enquadrada no formato) e título e demais elementos ficam por cima, com legibilidade (pode escurecer ou suavizar levemente o fundo). Nos demais casos, use em destaque, uma única vez, nunca cortada pelas bordas e fora das regiões calmas reservadas ao logo. Nunca redesenhe nem troque o conteúdo das imagens do cliente.'
    );
  }
  lines.push(
    '',
    '[PROIBIDO]',
    '- Logos, marcas d\'água, marcas de terceiros, interface de aplicativo inventada, molduras/bordas.',
    '- Elementos duplicados (cada objeto, personagem ou texto aparece uma única vez), mãos/dedos deformados, anatomia estranha.'
  );
  return lines.filter((l) => l !== null).join('\n').replace(/\n{3,}/g, '\n\n');
}

// Prompt do modo "designer" (padrão): a IA recebe logo + mascote + anexos como
// referência e monta a ARTE INTEIRA — logo em destaque, mascote grande, título
// com tipografia da marca — como um designer de agência faria.
function buildDesignPrompt({ cfg, isFeed, mascot, attachCount, attachUses, palette, title, brief, headline, subline }) {
  const mRule = /regra\s*60\s*[-–]\s*30\s*[-–]\s*10\s*:\s*([^\n]+)/i.exec(brief);
  const colorRule = mRule ? mRule[1].trim().replace(/[.;]+$/, '') : '';
  const noCta = /CTA\s*:\s*(nenhum|n[aã]o\s+h[aá]|sem\b)/i.test(brief);

  const refs = ['LOGO OFICIAL da marca "' + cfg.nome + '"'];
  if (mascot) refs.push('MASCOTE OFICIAL da marca');
  for (let i = 1; i <= attachCount; i++) {
    const u = attachUses && attachUses[i - 1];
    refs.push('imagem do cliente nº ' + i + (u ? ' — INSTRUÇÃO DE USO: ' + u : ' (sem instrução: use como produto/elemento em destaque, fiel ao original)'));
  }

  const lines = [
    'Crie a ARTE FINAL, pronta para publicar, de ' + (isFeed ? 'um post de feed do Instagram (vertical 4:5)' : 'um story do Instagram (vertical 9:16)') +
      ' da marca "' + cfg.nome + '", exatamente como um designer sênior de agência faria: composição completa, rica e profissional, com acabamento de campanha — nunca um mockup simples ou uma cena solta.',
    '',
    'IMAGENS DE REFERÊNCIA ANEXADAS (nesta ordem):',
    ...refs.map((t, i) => (i + 1) + '. ' + t),
    '',
    'CONTEÚDO (use todos os blocos do card):',
    title ? '- Tema do post: ' + title : null,
    '- O briefing abaixo traz os blocos do card (os que existirem): TEXTO DA POSTAGEM (a legenda — a cena e o título devem comunicar a mesma ideia), FORMATO E ESPECIFICAÇÕES (proporção e regras de composição — obedeça), INTENÇÃO DA POSTAGEM (objetivo e clima) e BRIEFING CRIATIVO / O QUE A IMAGEM DEVE MOSTRAR (cena e estilo — siga com fidelidade).',
    '',
    brief,
    '',
    'TEXTO NA ARTE:',
    headline
      ? '- Título (escreva EXATAMENTE assim, sem trocar nenhuma palavra ou letra — é a frase do próprio post): "' + headline + '".'
      : '- Crie UM título curto e chamativo em português do Brasil (máx. 8 palavras), usando as palavras do TEXTO DA POSTAGEM.',
    subline ? '- Linha de apoio, menor, abaixo do título (EXATAMENTE assim): "' + subline + '".' : null,
    '- Tipografia: ' + (cfg.typo || 'forte, legível e com personalidade da marca') + ' Título GRANDE e bem legível no celular, no máximo 3 linhas, alto contraste com o fundo.',
    '- Nenhum outro texto além do título, da linha de apoio e do que o briefing pedir de forma explícita. Todo texto em português do Brasil, escrito corretamente, sem letras inventadas.',
    '',
    'LOGO E MARCA:',
    '- Use o LOGO da imagem de referência 1, FIEL ao original (mesmas formas, cores e letras — não redesenhe nem distorça), UMA única vez, em destaque e em tamanho confortável (cerca de 30–40% da largura), na posição que equilibrar melhor a composição (em geral topo centralizado).' + (mascot ? ' O mascote de referência pode já ter o logo no boné, uniforme ou produto: mantenha como está, mas não repita o logo como elemento solto.' : ' Não repita o logo como elemento solto em outros lugares.'),
    '',
    'COMPOSIÇÃO E IMPACTO:',
    mascot
      ? '- O MASCOTE (referência 2) é o herói da cena: GRANDE e expressivo (cerca de 40–55% da altura da arte, plano médio ou close), FIEL ao original (mesmo personagem, proporções, roupa e cores — não recrie nem reinterprete), interagindo com o produto/cena e com o clima do texto (gestos, olhar e expressão que conectem com a mensagem).'
      : '- O elemento herói (produto ou cena principal) é GRANDE, nítido e bem iluminado, ocupando cerca de 35–50% da altura da arte.',
    attachCount > 0
      ? '- IMAGENS DO CLIENTE (referências ' + (mascot ? '3' : '2') + (attachCount > 1 ? ' a ' + ((mascot ? 2 : 1) + attachCount) : '') + '): siga a INSTRUÇÃO DE USO de cada uma, indicada na lista de referências acima. Se a instrução for usar como FUNDO, a imagem cobre a arte inteira (enquadrada no formato) e título, logo e demais elementos ficam por cima, com legibilidade (pode escurecer ou suavizar levemente o fundo para o texto ler bem). Sem instrução, use a imagem em destaque como elemento herói, FIEL ao original (mesma embalagem, rótulo, formato e cores), uma única vez. Nunca redesenhe nem troque o conteúdo das imagens do cliente.'
      : null,
    '- Hierarquia clara: logo → título → herói. Elementos decorativos coerentes com o tema (ex.: estrelas, lua, formas curvas na cor de destaque, luzes, texturas), para dar acabamento e movimento — sem poluir.',
    '- Cenário e iluminação coerentes com o texto (momento do dia, clima), com profundidade de campo e cores bem harmonizadas.',
    colorRule
      ? '- REGRA DE CORES OBRIGATÓRIA (60-30-10): ' + colorRule + '. Distribua as cores exatamente nessa proporção da área visível; a cor de 30% precisa aparecer em áreas grandes e marcantes, e a de 10% nos textos/acentos. Tem prioridade sobre qualquer outra escolha de cor.'
      : (palette ? '- Paleta oficial da marca: ' + palette + '. Use essas cores como dominantes.' : null),
    noCta ? '- Este post NÃO tem chamada para ação: sem botão, seta, "saiba mais" ou texto de CTA.' : null,
    isFeed
      ? '- Mantenha tudo que é importante na área central da imagem (as bordas de cima e de baixo podem ser cortadas).'
      : '- Deixe o topo (cerca de 8%) e a base (cerca de 12%) sem texto importante: a interface do Instagram cobre essas áreas.',
    '',
    'ESTILO DA MARCA: ' + (cfg.style || 'visual profissional e limpo.'),
    '',
    'PROIBIDO: logo duplicado como elemento solto, marcas d\'água, marcas de terceiros, interface de aplicativo inventada, molduras/bordas, texto com erro ou inventado, mãos/dedos deformados, elementos repetidos sem motivo.'
  ];
  return lines.filter((l) => l !== null).join('\n').replace(/\n{3,}/g, '\n\n');
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido' });
    return;
  }

  try {
    const { profile, prompt, format, palette, includeMascot, title, texto, headline, subline, extraRefs, quality, engine, logoMode } = JSON.parse(await readBody(req));

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

    // Motor: 'openai' (GPT Image — padrão), 'gemini' (Nano Banana) ou 'gemini-pro' (Nano Banana Pro).
    let eng = engine || (quality === 'premium' ? 'gemini-pro' : 'openai');
    if (eng === 'openai' && !openaiKey) eng = 'gemini';
    if (eng !== 'openai' && !geminiKey) eng = 'openai';
    const useOpenAI = eng === 'openai';

    const brand = await loadBrandFromSupabase(profile);
    const logo = brand.logo || loadRef(profile, 'logo');
    if (!logo) {
      res.status(400).json({ error: 'Logo de ' + cfg.nome + ' não encontrado. Anexe o logo na janela "Gerar imagem" (seção Logos e mascotes).' });
      return;
    }
    const mascot = includeMascot ? (brand.mascote || loadRef(profile, 'mascote')) : null;

    const isFeed = String(format || '').toLowerCase() === 'post';
    // logoMode 'panel': o logo NÃO vai pra IA e o painel aplica o original por cima.
    // Padrão ('ai'): o logo vai como referência 1 e a IA o integra na arte.
    const aiLogo = logoMode !== 'panel';
    const refs = [];
    if (aiLogo) refs.push(logo);
    if (mascot) refs.push(mascot);
    // Imagens que o cliente anexou no painel pra compor a arte (ex.: o produto da promoção).
    let attachCount = 0;
    const attachUses = []; // instrução de uso de cada imagem anexada ("colocar como fundo", etc.)
    (Array.isArray(extraRefs) ? extraRefs.slice(0, 3) : []).forEach((x, i) => {
      if (!x || typeof x.data !== 'string' || x.data.length < 100 || x.data.length > 1800000) return;
      const mime = /^image\/(png|jpeg|webp)$/.test(x.mime || '') ? x.mime : 'image/jpeg';
      refs.push({ buffer: Buffer.from(x.data, 'base64'), mime, fileName: 'anexo' + (i + 1) + '.' + (mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg') });
      attachUses.push(typeof x.usage === 'string' ? x.usage.replace(/\s+/g, ' ').trim().slice(0, 220) : '');
      attachCount++;
    });

    const common = {
      cfg, isFeed, mascot: !!mascot, attachCount, attachUses, palette,
      title: title ? String(title).slice(0, 200) : '',
      headline: headline ? String(headline).trim().slice(0, 120) : '',
      subline: subline ? String(subline).trim().slice(0, 100) : '',
      brief: String(prompt).trim().slice(0, 7000)
    };
    const fullPrompt = aiLogo
      ? buildDesignPrompt(common)
      : buildPrompt({ ...common, caption: '' }); // o texto da postagem já vai dentro do briefing

    const t0 = Date.now();
    let result, provider;
    const runOpenAI = (timeoutMs, q) => generateWithOpenAI({ apiKey: openaiKey, prompt: fullPrompt, refs, timeoutMs, isFeed, quality: q });
    const runGemini = (premium) => generateWithGemini({ apiKey: geminiKey, prompt: fullPrompt, refs, aspect: isFeed ? '4:5' : '9:16', premium });
    try {
      if (useOpenAI) { provider = 'openai'; result = await runOpenAI(105000); }
      else { provider = 'gemini'; result = await runGemini(eng === 'gemini-pro'); }
    } catch (e) {
      console.log('[generate-image] falhou', provider, String(e.message).slice(0, 300), (Date.now() - t0) + 'ms');
      // Falhou RÁPIDO e existe o outro motor: tenta nele. Se já gastou tempo
      // (ex.: timeout), não há folga pra reserva — responde o erro.
      const spent = Date.now() - t0;
      const other = provider === 'gemini' ? !!openaiKey : !!geminiKey;
      if (other && spent < 25000) {
        try {
          if (provider === 'gemini') { provider = 'openai'; result = await runOpenAI(100000 - spent - 5000, 'medium'); }
          else { provider = 'gemini'; result = await runGemini(false); }
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
      usedLogo: aiLogo, logoOverlay: !aiLogo, usedMascot: !!mascot, usedAttachments: attachCount, provider, model: result.model
    });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Erro inesperado ao gerar a imagem.' });
  }
};

module.exports.buildPrompt = buildPrompt;
module.exports.buildDesignPrompt = buildDesignPrompt;
module.exports.findImageData = findImageData;
module.exports.generateWithGemini = generateWithGemini;
