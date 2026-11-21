// Métricas da organização a partir dos dados sincronizados (tabela account_insights).
// Soma as contas de cada dia e compara com o período anterior de mesmo tamanho.
// Só lê dados que a sincronização gravou; o que a API não fornece fica de fora.

const { rest } = require('./meta-oauth');

const DATA = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DIAS = 365;

function addDias(ds, n) {
  const [y, m, d] = ds.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}
function diasEntre(ini, fim) {
  const [y1, m1, d1] = ini.split('-').map(Number);
  const [y2, m2, d2] = fim.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000) + 1;
}

// Valida o período pedido. Lança erro com mensagem clara.
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
    const d = { data, alcance: null, engajamento: null, cliques: null, seguidores: null };
    for (const l of linhas.filter((x) => x.metric_date === data)) {
      if (l.reach != null) d.alcance = somar(d.alcance, l.reach);
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
  const t = { alcance: null, engajamento: null, cliques: null };
  for (const d of serie) {
    if (d.alcance != null) t.alcance = somar(t.alcance, d.alcance);
    if (d.engajamento != null) t.engajamento = somar(t.engajamento, d.engajamento);
    if (d.cliques != null) t.cliques = somar(t.cliques, d.cliques);
  }
  return t;
}

// Consulta o período e o anterior de mesmo tamanho.
async function consultarMetricas({ orgId, ini, fim, cfg, f }) {
  validarPeriodo(ini, fim);
  const dias = diasEntre(ini, fim);
  const antIni = addDias(ini, -dias);
  const antFim = addDias(ini, -1);
  const org = encodeURIComponent(orgId);
  const linhas = await rest(cfg, f, 'GET',
    `account_insights?select=metric_date,social_account_id,reach,engagement,website_clicks,followers_count` +
    `&organization_id=eq.${org}&metric_date=gte.${antIni}&metric_date=lte.${fim}&order=metric_date.asc`) || [];
  const atuais = linhas.filter((l) => l.metric_date >= ini && l.metric_date <= fim);
  const anteriores = linhas.filter((l) => l.metric_date >= antIni && l.metric_date <= antFim);
  const serie = agregarPorDia(atuais);
  const contas = (await rest(cfg, f, 'GET',
    `social_accounts?select=id&organization_id=eq.${org}&platform=eq.instagram&status=eq.active`) || []).length;
  return {
    ini, fim, dias,
    serie,
    totais: totaisDe(serie),
    anteriores: totaisDe(agregarPorDia(anteriores)),
    seguidoresFim: serie.length ? serie[serie.length - 1].seguidores : null,
    contas,
    contasComDados: new Set(atuais.map((l) => l.social_account_id)).size
  };
}

module.exports = { consultarMetricas, validarPeriodo, addDias, agregarPorDia, totaisDe };
