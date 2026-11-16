// Catálogo real da Sorvetes Guri (projeto Siteguri, loja "guri_padrao"), lido ao vivo.
//
// Usado em dois lugares:
//   - api/auto-content.js: o Modo Automático escolhe produtos da loja/gourmet DESTA lista
//     (não da lista escrita à mão no CONTEXTO.md) e grava no card o nome exato ("produto").
//   - api/guri-produto.js: acha o produto de um card e devolve a foto real para o gerador de imagem.
//
// Só leitura, com a chave pública (anon) que o próprio site da loja usa no navegador.
// Preço NÃO sai daqui: a regra do CONTEXTO.md é não citar valor fora de campanha ativa.
// Os sabores do buffet (Caixa 7L) não estão cadastrados na loja: seguem na lista do CONTEXTO.md.

const GURI_URL = 'https://xzgdbkzchdrdvmtgvpzm.supabase.co';
const GURI_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6Z2Ria3pjaGRyZHZtdGd2cHptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1OTQ5MzksImV4cCI6MjA5MzE3MDkzOX0.cbknNz3U7xqWUCCd6A4u6dG1wqbNsJTX7SknpobgMWA';
const TENANT = 'guri_padrao';
const SITE = 'https://sorvetesguriturvo.com.br';
const MENUS = ['loja', 'gourmet']; // delivery = combos do app, fora do Instagram

// Fotos só destes endereços (as que existem hoje no catálogo).
const IMAGE_HOSTS = ['xzgdbkzchdrdvmtgvpzm.supabase.co', 'sorvetesguriturvo.com.br', 'www.sorvetesguriturvo.com.br',
  'sorveteriaguriturvo.menulegal.app', 'myedocfiles.s3.sa-east-1.amazonaws.com'];

async function rest(path) {
  const r = await fetch(`${GURI_URL}/rest/v1/${path}`, { headers: { apikey: GURI_ANON, Authorization: `Bearer ${GURI_ANON}` } });
  if (!r.ok) throw new Error(`catálogo Guri ${r.status}`);
  return r.json();
}

function absImage(img) {
  const s = String(img || '').trim();
  if (!s || s.startsWith('data:')) return '';
  if (/^https?:\/\//i.test(s)) return s;
  return SITE + (s.startsWith('/') ? s : '/' + s);
}

// [{ nome, categoria, menu, imagem }] — só ativos, com foto, sem itens genéricos de balcão.
async function fetchCatalog() {
  const [prods, cats] = await Promise.all([
    rest(`products?select=name,category,image,menu_type,active&tenant_id=eq.${TENANT}&active=eq.true&limit=1000`),
    rest(`categories?select=id,label&tenant_id=eq.${TENANT}&limit=500`)
  ]);
  const label = {};
  cats.forEach((c) => { label[c.id] = c.label; });
  return prods
    .filter((p) => MENUS.includes(p.menu_type) && absImage(p.image))
    .filter((p) => !/^(caixa 7l|buffet por kg|coberturas|pacote de)/i.test(String(p.name).trim()))
    .map((p) => ({ nome: String(p.name).trim(), categoria: label[p.category] || p.category || 'Outros', menu: p.menu_type, imagem: absImage(p.image) }))
    // Bebidas de terceiros (refrigerante, energético, cerveja) não são produto da marca para post.
    .filter((p) => !/bebida/i.test(p.categoria) && !/^bebidas$/i.test(p.categoria));
}

// Bloco para o prompt do Modo Automático: produtos agrupados por categoria.
function catalogPromptBlock(catalog) {
  const groups = {};
  catalog.forEach((p) => { const k = (p.menu === 'gourmet' ? 'Cardápio gourmet — ' : 'Loja — ') + p.categoria; (groups[k] = groups[k] || []).push(p.nome); });
  return Object.keys(groups).sort().map((k) => `- ${k}: ${groups[k].join('; ')}`).join('\n');
}

// ── Achar o produto de um card ───────────────────────────────────────────
const ABBR = { pic: 'picole', pt: 'pote', sorv: 'sorvete', brig: 'brigadeiro', choc: 'chocolate', croc: 'crocante',
  cond: 'condensado', lamorena: 'la morena', chanty: 'chantilly', c: 'com' };
const STOP = new Set(('de da do das dos com e a o em no na para pra um uma sabor sabores produto produtos loja nossa nosso ' +
  'guri sorvetes linha novo nova dia hoje destaque especial ml kg g l lt litros').split(' '));
// Palavras de formato: ajudam a desempatar, mas sozinhas não bastam para dizer qual é o produto.
const GENERIC = new Set('picole pote sorvete copo cone casquinha balde baldone taca milkshake fruta leite'.split(' '));

function tokens(text) {
  const t = String(text || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/c\//g, 'com ').replace(/[^a-z0-9]+/g, ' ').split(' ').filter(Boolean)
    .map((w) => ABBR[w] || w).join(' ').split(' ');
  return [...new Set(t.filter((w) => w.length > 1 && !STOP.has(w) && !/^\d+$/.test(w)))];
}

// Pilares que não são um produto da loja (buffet tem lista própria; o resto não mostra produto).
const NOT_PRODUCT = /buffet|caixa 7l|encerramento|humaniza|carrinho|enquete|bastidor/i;

// Melhor produto para o texto (título do card ou nome exato gravado pelo Modo Automático).
// Devolve { produto, score } ou null quando não há um produto claramente citado.
function matchProduct(text, catalog) {
  const raw = String(text || '').trim();
  if (!raw) return null;
  const exact = catalog.find((p) => p.nome.toLowerCase() === raw.toLowerCase());
  if (exact) return { produto: exact, score: 1 };
  if (NOT_PRODUCT.test(raw)) return null;
  const q = new Set(tokens(raw));
  let best = null;
  catalog.forEach((p) => {
    const pt = tokens(p.nome);
    if (!pt.length) return;
    const hit = pt.filter((w) => q.has(w));
    const strong = hit.filter((w) => !GENERIC.has(w)).length;
    if (!strong) return; // só "picolé"/"pote" em comum não identifica produto
    const score = hit.length / pt.length;
    if (hit.length < 2 && score < 0.5) return;
    if (!best || score > best.score || (score === best.score && pt.length < tokens(best.produto.nome).length)) best = { produto: p, score };
  });
  return best;
}

function imageAllowed(url) {
  try { return IMAGE_HOSTS.includes(new URL(url).hostname); } catch (e) { return false; }
}

module.exports = { fetchCatalog, catalogPromptBlock, matchProduct, tokens, imageAllowed, absImage };
