// Relatórios de redes sociais: semanal, mensal ou personalizado, sempre com dados sincronizados.
// Usa os mesmos cálculos da Visão geral (metricas.js), das publicações e dos concorrentes.
// Sem dado: "n/d" (não disponível). Nunca zero, nunca estimativa.
// PDF é feito pela tela (impressão do navegador); aqui saem a estrutura e o CSV.

const metricas = require('./metricas');
const publicacoes = require('./publicacoes');
const concorrentes = require('./concorrentes');
const { diaBR } = require('./sync-instagram');

const TIPOS = ['semanal', 'mensal', 'personalizado'];
const TITULOS = { semanal: 'Relatório semanal', mensal: 'Relatório mensal', personalizado: 'Relatório personalizado' };
const DIA = 86400000;
const MAX_PUBLICACOES = 200;
const MAX_LEGENDA = 60;
const SEP = ';';

class ErroRelatorio extends Error {
  constructor(mensagem, status = 400) {
    super(mensagem);
    this.status = status;
  }
}

// Período do tipo escolhido. Os dados vão até ontem (o dia de hoje ainda não está completo).
// Semanal: últimos 7 dias. Mensal: o mês civil anterior, completo. Personalizado: as datas pedidas.
function periodoDoTipo(tipo, agora, ini, fim) {
  const ontem = diaBR(agora - DIA);
  if (tipo === 'semanal') return { ini: metricas.addDias(ontem, -6), fim: ontem };
  if (tipo === 'mensal') {
    const primeiroDoMesAtual = diaBR(agora).slice(0, 8) + '01';
    const ultimoDoMesAnterior = metricas.addDias(primeiroDoMesAtual, -1);
    return { ini: ultimoDoMesAnterior.slice(0, 8) + '01', fim: ultimoDoMesAnterior };
  }
  return { ini, fim: fim > ontem ? ontem : fim };
}

// Variação em % contra o período anterior. Sem o anterior (ou zero): null, nunca infinito.
function variacao(atual, anterior) {
  if (atual == null || anterior == null || anterior === 0) return null;
  return Math.round(((atual - anterior) / anterior) * 1000) / 10;
}

const INDICADORES = [
  { chave: 'alcance', rotulo: 'Alcance' },
  { chave: 'visualizacoes', rotulo: 'Visualizações' },
  { chave: 'engajamento', rotulo: 'Engajamento' },
  { chave: 'cliques', rotulo: 'Cliques no link' }
];

const LIMITACOES_FIXAS = [
  'Impressões: a Meta descontinuou a métrica, por isso não aparecem aqui.',
  'Visitas ao perfil: a Meta retirou esta métrica em janeiro de 2025. O painel não mostra este dado.',
  'Seguidores ganhos e perdidos: a API não separa os dois. Aparece o saldo do período.',
  'Alcance de concorrentes: a API não libera. Visualizações de concorrentes só existem em Reels, e o painel ainda não as mostra.',
  'n/d = não disponível pela API, ou sem sincronização no período.'
];

async function gerarRelatorio({ orgId, tipo, ini, fim, contaId = null, agora, cfg, f }) {
  if (!TIPOS.includes(tipo)) throw new ErroRelatorio('Tipo de relatório desconhecido.');
  const ontem = diaBR(agora - DIA);
  if (tipo === 'personalizado') {
    if (!ini || !fim) throw new ErroRelatorio('Informe as datas inicial e final.');
    if (ini > ontem) throw new ErroRelatorio('Os dados vão até ontem. Escolha um período que termine antes de hoje.');
  }
  const p = periodoDoTipo(tipo, agora, ini, fim);
  try {
    metricas.validarPeriodo(p.ini, p.fim);
  } catch (e) {
    throw new ErroRelatorio(e.message);
  }

  const m = await metricas.consultarMetricas({ orgId, ini: p.ini, fim: p.fim, cfg, f, contaId });
  if (contaId && !m.listaContas.some((c) => c.id === contaId)) {
    throw new ErroRelatorio('Conta não encontrada nesta organização.');
  }
  const contas = m.listaContas.filter((c) => !contaId || c.id === contaId);

  const todas = await publicacoes.consultarPublicacoes({ orgId, contaId, ordem: 'data', limite: MAX_PUBLICACOES, cfg, f });
  const noPeriodo = todas.publicacoes.filter((x) => {
    const dia = diaBR(Date.parse(x.publicadoEm));
    return dia >= p.ini && dia <= p.fim;
  });

  const anteriorIni = metricas.addDias(p.ini, -m.dias);
  const anteriorFim = metricas.addDias(p.ini, -1);

  const lista = await concorrentes.listarConcorrentes({ orgId, cfg, f });
  const concorrentesComResumo = lista.filter((c) => c.ultimo).map((c) => ({
    perfil: c.handle,
    capturadoEm: diaBR(Date.parse(c.ultimo.capturadoEm)),
    seguidores: c.ultimo.seguidores,
    publicacoes30d: c.ultimo.publicacoes30d,
    engajamentoMedio: c.ultimo.engajamentoMedio
  }));

  const limitacoes = [...LIMITACOES_FIXAS];
  if (!m.publico) limitacoes.push('Público dos seguidores: a Meta só informa com 100 seguidores ou mais.');
  if (!m.melhoresHorarios || !m.melhoresHorarios.suficiente) {
    limitacoes.push('Melhores horários: precisa de pelo menos 10 publicações com medição.');
  }
  if (m.serie.length === 0) limitacoes.push('Sem métricas diárias da conta neste período. Sincronize as contas ou escolha outro período.');

  const escopo = contaId && contas.length ? '@' + contas[0].username : 'todas as contas do Instagram';

  return {
    tipo,
    titulo: TITULOS[tipo],
    geradoEm: new Date(agora).toISOString(),
    periodo: { ini: p.ini, fim: p.fim, dias: m.dias },
    periodoAnterior: { ini: anteriorIni, fim: anteriorFim },
    escopo,
    contas: contas.map((c) => c.username),
    semDados: m.serie.length === 0 && noPeriodo.length === 0,
    indicadores: INDICADORES.map((i) => ({
      chave: i.chave,
      rotulo: i.rotulo,
      valor: m.totais[i.chave],
      anterior: m.anteriores[i.chave],
      variacao: variacao(m.totais[i.chave], m.anteriores[i.chave])
    })),
    seguidores: { noFim: m.seguidoresFim, saldo: m.saldoSeguidores },
    diario: m.serie.map((d) => ({
      data: d.data, alcance: d.alcance, visualizacoes: d.visualizacoes,
      engajamento: d.engajamento, cliques: d.cliques, seguidores: d.seguidores
    })),
    publicacoes: noPeriodo.map((x) => ({
      tipo: x.tipoLabel,
      data: diaBR(Date.parse(x.publicadoEm)),
      hora: new Date(Date.parse(x.publicadoEm) - 3 * 3600 * 1000).getUTCHours(),
      conta: x.conta,
      legenda: Array.from(x.legenda || '').slice(0, MAX_LEGENDA).join(''),
      alcance: x.alcance,
      visualizacoes: x.visualizacoes,
      curtidas: x.curtidas,
      comentarios: x.comentarios,
      salvamentos: x.salvamentos,
      compartilhamentos: x.compartilhamentos,
      engajamento: x.engajamento,
      seguidoresGerados: x.seguidoresGerados,
      link: x.permalink || ''
    })),
    horarios: m.melhoresHorarios && m.melhoresHorarios.suficiente
      ? { suficiente: true, publicacoesComMedicao: m.melhoresHorarios.posts, top: m.melhoresHorarios.top.slice(0, 5) }
      : { suficiente: false, publicacoesComMedicao: m.melhoresHorarios ? m.melhoresHorarios.posts : 0, top: [] },
    publico: m.publico ? { atualizadoEm: m.publico.snapshot, idade: m.publico.idade, genero: m.publico.genero, cidades: m.publico.cidades } : null,
    concorrentes: concorrentesComResumo,
    limitacoes
  };
}

// CSV em UTF-8 com BOM (o Excel em português abre certo), separador ";" e vírgula decimal.
function celula(v) {
  if (v === null || v === undefined) return 'n/d';
  const s = typeof v === 'number' ? String(v).replace('.', ',') : String(v);
  return /[;"\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
const linha = (valores) => valores.map(celula).join(SEP);

function csvDoRelatorio(r) {
  const l = [];
  l.push(linha(['Relatório', r.titulo]));
  l.push(linha(['Período', `${r.periodo.ini} a ${r.periodo.fim}`, `${r.periodo.dias} dias`]));
  l.push(linha(['Período anterior', `${r.periodoAnterior.ini} a ${r.periodoAnterior.fim}`]));
  l.push(linha(['Escopo', r.escopo]));
  l.push(linha(['Gerado em', r.geradoEm]));
  l.push('');
  l.push(linha(['Indicador', 'Valor', 'Período anterior', 'Variação (%)']));
  for (const i of r.indicadores) l.push(linha([i.rotulo, i.valor, i.anterior, i.variacao]));
  l.push(linha(['Seguidores no fim do período', r.seguidores.noFim]));
  l.push(linha(['Saldo de seguidores', r.seguidores.saldo]));
  l.push('');
  l.push(linha(['Data', 'Alcance', 'Visualizações', 'Engajamento', 'Cliques no link', 'Seguidores']));
  for (const d of r.diario) l.push(linha([d.data, d.alcance, d.visualizacoes, d.engajamento, d.cliques, d.seguidores]));
  l.push('');
  l.push(linha(['Tipo', 'Data', 'Hora', 'Conta', 'Legenda', 'Alcance', 'Visualizações', 'Curtidas', 'Comentários', 'Salvamentos', 'Compartilhamentos', 'Engajamento', 'Seguidores gerados', 'Link']));
  for (const p of r.publicacoes) {
    l.push(linha([p.tipo, p.data, p.hora, p.conta, p.legenda, p.alcance, p.visualizacoes, p.curtidas, p.comentarios, p.salvamentos, p.compartilhamentos, p.engajamento, p.seguidoresGerados, p.link]));
  }
  if (r.concorrentes.length) {
    l.push('');
    l.push(linha(['Concorrente', 'Seguidores', 'Publicações em 30 dias', 'Engajamento médio', 'Atualizado em']));
    for (const c of r.concorrentes) l.push(linha([`@${c.perfil}`, c.seguidores, c.publicacoes30d, c.engajamentoMedio, c.capturadoEm]));
  }
  l.push('');
  l.push(linha(['Limitações']));
  for (const x of r.limitacoes) l.push(linha([x]));
  return '﻿' + l.join('\r\n');
}

module.exports = { ErroRelatorio, TIPOS, periodoDoTipo, variacao, gerarRelatorio, csvDoRelatorio };
