// Lista de publicações sincronizadas (posts, reels, stories e carrosséis) com a medição mais recente.
// Só mostra o que a sincronização gravou. Campo sem dado vem como null (a tela mostra "—").

const { rest } = require('./meta-oauth');

const TIPOS = ['post', 'reel', 'story', 'carousel', 'video', 'other'];
const ORDENS = ['data', 'alcance', 'visualizacoes', 'engajamento'];
const ROTULO_TIPO = { post: 'Post', reel: 'Reel', story: 'Story', carousel: 'Carrossel', video: 'Vídeo', other: 'Outro' };
const CHAVE_ORDEM = { alcance: 'alcance', visualizacoes: 'visualizacoes', engajamento: 'engajamento' };
const LIMITE_PADRAO = 60;
const LIMITE_MAXIMO = 200;
const PAGINAS_MAXIMAS = 100; // trava de segurança: 100 páginas de até 1000 linhas

function ordenar(lista, ordem) {
  const chave = CHAVE_ORDEM[ordem];
  if (!chave) return lista; // "data": já vem do mais recente
  return [...lista].sort((a, b) => {
    const va = a[chave], vb = b[chave];
    if (va == null && vb == null) return 0;
    if (va == null) return 1;   // sem dado vai para o fim
    if (vb == null) return -1;
    return vb - va;
  });
}

// O PostgREST devolve no máximo 1000 linhas por resposta. A tabela de medições cresce a cada
// sincronização, então a leitura continua página a página até acabar. Sem isso, as publicações
// mais antigas perderiam a medição mais recente.
async function lerTodas(cfg, f, caminho) {
  const tudo = [];
  for (let pagina = 0; pagina < PAGINAS_MAXIMAS; pagina++) {
    const lote = await rest(cfg, f, 'GET', `${caminho}&offset=${tudo.length}`) || [];
    if (!lote.length) break;
    tudo.push(...lote);
  }
  return tudo;
}

// Devolve { publicacoes, contas }. "contas" são as contas do Instagram, para o filtro da tela.
async function consultarPublicacoes({ orgId, contaId = null, tipo = null, ordem = 'data', limite = LIMITE_PADRAO, cfg, f }) {
  const org = encodeURIComponent(orgId);

  const contasBrutas = await rest(cfg, f, 'GET',
    `social_accounts?select=id,username&organization_id=eq.${org}&platform=eq.instagram&order=username.asc`) || [];
  const contas = contasBrutas.map((c) => ({ id: c.id, username: c.username || c.id }));
  const nomeConta = Object.fromEntries(contas.map((c) => [c.id, c.username]));

  let filtro = '';
  if (contaId) filtro += `&social_account_id=eq.${encodeURIComponent(contaId)}`;
  if (tipo && TIPOS.includes(tipo)) filtro += `&content_type=eq.${tipo}`;

  const posts = await rest(cfg, f, 'GET',
    `social_posts?select=id,social_account_id,content_type,media_type,permalink,thumbnail_url,caption,published_at` +
    `&organization_id=eq.${org}${filtro}&order=published_at.desc&limit=${Math.min(Number(limite) || LIMITE_PADRAO, LIMITE_MAXIMO)}`) || [];
  if (!posts.length) return { publicacoes: [], contas };

  const ids = posts.map((p) => p.id).join(',');
  const medicoes = await lerTodas(cfg, f,
    `post_insights?select=social_post_id,reach,views,likes,comments,shares,saves,engagement,follows_gained,collected_at` +
    `&social_post_id=in.(${ids})&order=collected_at.desc,id.desc`);
  const ultima = {}; // a primeira linha de cada publicação é a medição mais recente
  for (const m of medicoes) {
    if (ultima[m.social_post_id] === undefined) ultima[m.social_post_id] = m;
  }

  const lista = posts.map((p) => {
    const m = ultima[p.id] || {};
    return {
      id: p.id,
      conta: nomeConta[p.social_account_id] || null,
      tipo: p.content_type,
      tipoLabel: ROTULO_TIPO[p.content_type] || 'Outro',
      permalink: p.permalink || null,
      miniatura: p.thumbnail_url || null,
      legenda: Array.from(p.caption || '').slice(0, 140).join(''), // corta por caractere, sem quebrar emoji
      publicadoEm: p.published_at,
      alcance: m.reach ?? null,
      visualizacoes: m.views ?? null,
      curtidas: m.likes ?? null,
      comentarios: m.comments ?? null,
      compartilhamentos: m.shares ?? null,
      salvamentos: m.saves ?? null,
      engajamento: m.engagement ?? null,
      seguidoresGerados: m.follows_gained ?? null,
      medidoEm: m.collected_at || null
    };
  });
  return { publicacoes: ordenar(lista, ordem), contas };
}

module.exports = { consultarPublicacoes, ordenar, lerTodas, TIPOS, ORDENS };
