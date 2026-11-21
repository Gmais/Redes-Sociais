// Métricas da organização a partir dos dados sincronizados.
// - Visão geral: soma das contas por dia, comparação com o período anterior e saldo de seguidores.
// - Público: demografia dos seguidores do snapshot mais recente (a API só devolve com 100+ seguidores).
// - Melhores horários: média de engajamento das PRÓPRIAS publicações por dia e horário (Brasília).
// - Filtro: uma conta específica (contaId) ou todas as contas do Instagram.
// Só lê o que a sincronização gravou. O que a API não fornece não é inventado.

const { rest } = require('./meta-oauth');

const DATA = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DIAS = 365;
const MIN_POSTS_HORARIO = 10;
const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const GENERO = { F: 'Feminino', M: 'Masculino', U: 'Não informado' };

function addDias(ds, n) {
  const [y, m, d] = ds.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}
function diasEntre(ini, fim) {
  const [y1, m1, d1] = ini.split('-').map(Number);
  const [y2, m2, d2] = fim.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000) + 1;
}

function validarPeriodo(ini, fim) {
  if (!DATA.test(ini) || !DATA.test(fim)) throw new Error('datas inválidas (use AAAA-MM-DD)');
  if (ini > fim) throw new Error('a data inicial é depois da final');
  if (diasEntre(ini, fim) > MAX_DIAS) throw new Error('o período máximo é de 365 dias');
}

const somar = (a, b) => (a == null ? 0 : a) + (b == null ? 0 : b);

// Uma linha por dia com dado: soma das contas. Seguidores usam o último valor conhecido de cada
// conta (uma conta que não sincronizou naquele dia continua contando com o último número).
function agregarPorDia(linhas) {
  const dias = [...new Set(linhas.map((l) => l.metric_date))].sort();
  const ultimoSeguidor = {};
  return dias.map((data) => {
    const d = { data, alcance: null, visualizacoes: null, engajamento: null, cliques: null, seguidores: null };
    for (const l of linhas.filter((x) => x.metric_date === data)) {
      if (l.reach != null) d.alcance = somar(d.alcance, l.reach);
      if (l.views != null) d.visualizacoes = somar(d.visualizacoes, l.views);
      if (l.engagement != null) d.engajamento = somar(d.engajamento, l.engagement);
      if (l.website_clicks != null) d.cliques = somar(d.cliques, l.website_clicks);
      if (l.followers_count != null) ultimoSeguidor[l.social_account_id] = l.followers_count;
    }
    const valores = Object.values(ultimoSeguidor);
    d.seguidores = valores.length ? valores.reduce((a, b) => a + b, 0) : null;
    return d;
  });
}

function totaisDe(serie) {
  const t = { alcance: null, visualizacoes: null, engajamento: null, cliques: null };
  for (const d of serie) {
    for (const k of Object.keys(t)) {
      if (d[k] != null) t[k] = somar(t[k], d[k]);
    }
  }
  return t;
}

// Público do snapshot mais recente, somado entre as contas. Retorna null se não houver dados.
function publicoDe(linhas) {
  if (!linhas.length) return null;
  const ultimo = linhas.reduce((a, l) => (l.snapshot_date > a ? l.snapshot_date : a), '');
  const doDia = linhas.filter((l) => l.snapshot_date === ultimo);
  const grupos = { idade: {}, genero: {}, cidades: {}, paises: {} };
  for (const l of doDia) {
    const k = l.dimension_key || '';
    let grupo = null, rotulo = null;
    if (k.startsWith('age:')) { grupo = 'idade'; rotulo = k.slice(4); }
    else if (k.startsWith('gender:')) { grupo = 'genero'; rotulo = GENERO[k.slice(7)] || k.slice(7); }
    else if (l.dimension === 'city') { grupo = 'cidades'; rotulo = k; }
    else if (l.dimension === 'country') { grupo = 'paises'; rotulo = k; }
    if (!grupo) continue;
    grupos[grupo][rotulo] = somar(grupos[grupo][rotulo], l.value);
  }
  const porPct = (mapa, limite) => {
    const total = Object.values(mapa).reduce((a, b) => a + b, 0);
    if (!total) return [];
    return Object.entries(mapa)
      .map(([rotulo, v]) => ({ rotulo, pct: Math.round((v / total) * 1000) / 10 }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, limite || 99);
  };
  return {
    snapshot: ultimo,
    idade: porPct(grupos.idade), genero: porPct(grupos.genero),
    cidades: porPct(grupos.cidades, 6), paises: porPct(grupos.paises, 6)
  };
}

// Média de engajamento por dia e horário (Brasília) das próprias publicações com métricas.
function melhoresHorariosDe(posts, insights) {
  const ultimo = {}; // insights vêm do mais recente: a primeira medição de cada publicação vale
  for (const i of insights) {
    if (ultimo[i.social_post_id] === undefined && i.engagement != null) ultimo[i.social_post_id] = i.engagement;
  }
  const grupos = {};
  let contadas = 0;
  for (const p of posts) {
    const eng = ultimo[p.id];
    if (eng === undefined) continue;
    const brt = new Date(Date.parse(p.published_at) - 3 * 3600 * 1000);
    const chave = brt.getUTCDay() + ':' + brt.getUTCHours();
    const g = grupos[chave] || (grupos[chave] = { dia: brt.getUTCDay(), hora: brt.getUTCHours(), soma: 0, n: 0 });
    g.soma += eng;
    g.n += 1;
    contadas += 1;
  }
  if (contadas < MIN_POSTS_HORARIO) return { suficiente: false, posts: contadas, top: [] };
  const top = Object.values(grupos)
    .map((g) => ({ dia: DIAS_SEMANA[g.dia], hora: g.hora, media: Math.round((g.soma / g.n) * 10) / 10, posts: g.n }))
    .sort((a, b) => b.media - a.media)
    .slice(0, 3);
  return { suficiente: true, posts: contadas, top };
}

// Consulta o período, o anterior de mesmo tamanho, o público e os horários.
// contaId: uma conta específica; null = todas as contas do Instagram.
async function consultarMetricas({ orgId, ini, fim, cfg, f, contaId = null }) {
  validarPeriodo(ini, fim);
  const dias = diasEntre(ini, fim);
  const antIni = addDias(ini, -dias);
  const antFim = addDias(ini, -1);
  const org = encodeURIComponent(orgId);
  const filtroConta = contaId ? `&social_account_id=eq.${encodeURIComponent(contaId)}` : '';
  const daConta = (l) => !contaId || l.social_account_id === contaId;

  const linhas = (await rest(cfg, f, 'GET',
    `account_insights?select=metric_date,social_account_id,reach,views,engagement,website_clicks,followers_count` +
    `&organization_id=eq.${org}&metric_date=gte.${antIni}&metric_date=lte.${fim}&order=metric_date.asc${filtroConta}`) || []).filter(daConta);
  const atuais = linhas.filter((l) => l.metric_date >= ini && l.metric_date <= fim);
  const anteriores = linhas.filter((l) => l.metric_date >= antIni && l.metric_date <= antFim);
  const serie = agregarPorDia(atuais);
  const primeiro = serie.length ? serie[0].seguidores : null;
  const ultimoSeg = serie.length ? serie[serie.length - 1].seguidores : null;

  const listaContas = await rest(cfg, f, 'GET',
    `social_accounts?select=id,username,platform,parent_external_id&organization_id=eq.${org}&status=eq.active&order=connected_at.asc`) || [];
  const contasIg = listaContas.filter((c) => c.platform === 'instagram');

  const publicoLinhas = (await rest(cfg, f, 'GET',
    `audience_insights?select=snapshot_date,dimension,dimension_key,value,social_account_id&organization_id=eq.${org}` +
    `&order=snapshot_date.desc&limit=5000${filtroConta}`) || []).filter(daConta);

  const postsRec = (await rest(cfg, f, 'GET',
    `social_posts?select=id,published_at,social_account_id&organization_id=eq.${org}&published_at=gte.${addDias(fim, -90)}` +
    `&order=published_at.desc&limit=300${filtroConta}`) || []).filter(daConta);
  const idsPosts = new Set(postsRec.map((p) => p.id));
  const insightsPosts = (await rest(cfg, f, 'GET',
    `post_insights?select=social_post_id,engagement,collected_at&organization_id=eq.${org}&order=collected_at.desc&limit=5000`) || [])
    .filter((i) => idsPosts.has(i.social_post_id));

  return {
    ini, fim, dias,
    serie,
    totais: totaisDe(serie),
    anteriores: totaisDe(agregarPorDia(anteriores)),
    seguidoresFim: ultimoSeg,
    saldoSeguidores: primeiro != null && ultimoSeg != null ? ultimoSeg - primeiro : null,
    contas: contasIg.length,
    listaContas: contasIg.map((c) => ({ id: c.id, username: c.username || c.id })),
    temPaginaFacebook: listaContas.some((c) => c.platform === 'facebook'),
    contaAtual: contaId,
    contasComDados: new Set(atuais.map((l) => l.social_account_id)).size,
    publico: publicoDe(publicoLinhas),
    melhoresHorarios: melhoresHorariosDe(postsRec, insightsPosts)
  };
}

module.exports = { consultarMetricas, validarPeriodo, addDias, agregarPorDia, totaisDe, publicoDe, melhoresHorariosDe };
