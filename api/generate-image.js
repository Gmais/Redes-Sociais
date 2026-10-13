// Gera a imagem de um post com IA (OpenAI gpt-image-1) usando o logo e o
// mascote da marca como imagens de referência, pra que apareçam SEMPRE na arte.
// A chave (OPENAI_API_KEY) fica só aqui no backend, nunca no navegador.
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

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido' });
    return;
  }

  try {
    const { profile, prompt, format, palette, includeMascot } = JSON.parse(await readBody(req));

    const cfg = PROFILES[profile];
    if (!cfg) {
      res.status(400).json({ error: 'Perfil inválido: ' + profile });
      return;
    }
    if (!prompt || !String(prompt).trim()) {
      res.status(400).json({ error: 'Descrição da imagem ausente.' });
      return;
    }
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: 'OPENAI_API_KEY não configurada no Vercel.' });
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

    const rules = [
      'Crie uma arte para Instagram da marca "' + cfg.nome + '".',
      'Formato vertical ' + (isFeed ? '4:5 (feed). Mantenha todo o conteúdo importante e o logo dentro da área central, pois as bordas de cima e de baixo serão cortadas.' : '9:16 (story). Deixe margem segura no topo e na base.') + '',
      'A PRIMEIRA imagem de referência é o LOGO oficial da marca: coloque-o de forma bem visível (canto ou rodapé), idêntico ao original — mesmas formas, cores e letras, sem redesenhar nem distorcer.',
      mascot ? 'A SEGUNDA imagem de referência é o MASCOTE oficial: inclua-o na cena, fiel ao original (mesmo personagem, proporções e cores).' : '',
      palette ? 'Paleta oficial da marca: ' + palette + '. Não use cores fora dessa paleta.' : '',
      'Qualquer texto na imagem deve estar em português do Brasil, escrito corretamente.',
      '',
      'Descrição da arte:',
      String(prompt).trim()
    ].filter((l) => l !== null).join('\n');

    const size = '1024x1536';

    // gpt-image-1: /images/edits aceita várias imagens de referência.
    const form = new FormData();
    form.append('model', 'gpt-image-1');
    form.append('prompt', rules);
    form.append('size', size);
    form.append('quality', 'medium');
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
      const msg = (data && data.error && data.error.message) || JSON.stringify(data);
      res.status(502).json({ error: 'A IA recusou o pedido: ' + msg });
      return;
    }
    const b64 = data.data && data.data[0] && data.data[0].b64_json;
    if (!b64) {
      res.status(502).json({ error: 'A IA não devolveu imagem.' });
      return;
    }

    res.status(200).json({ ok: true, imageBase64: b64, mime: 'image/jpeg', usedLogo: true, usedMascot: !!mascot });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Erro inesperado ao gerar a imagem.' });
  }
};
