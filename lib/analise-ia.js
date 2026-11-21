// Análise com IA sobre os dados reais do período (botão "Gerar análise").
// O servidor calcula os números; a IA só redige a partir deles. Sem dado sincronizado, a IA nem é chamada.
//
// Entra no pedido: números do período, médias por tipo de publicação, datas e horas (Brasília),
// público agregado e o resumo público dos concorrentes.
// Não entra: legendas, tokens, identificadores e qualquer dado individual de seguidor.

const metricas = require('./metricas');
const publicacoes = require('./publicacoes');
const concorrentes = require('./concorrentes');
const { diaBR } = require('./sync-instagram');
const { rest } = require('./meta-oauth');

const OPENAI_URL = 'https://api.openai.com/v1';
const MAX_PUBLICACOES = 200; // a lista de publicações devolve as mais recentes até este número
const MAX_LISTA_PEDIDO = 60; // publicações detalhadas no pedido (o resto entra só nas médias)
const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;

// Emoji tem 2 unidades UTF-16: cortar no meio deixa um caractere quebrado. Corta por caractere.
const cortar = (s, n) => Array.from(String(s || '')).slice(0, n).join('');
const semSobras = (s) => String(s).replace(LONE_SURROGATE, '');

class ErroIA extends Error {
  constructor(mensagem, status = 502, detalhe = null) {
    super(mensagem);
    this.status = status;
    this.detalhe = detalhe;
  }
}

// Média dos valores que existem. null não conta como zero. Sem nenhum valor: null.
function media(valores) {
  const v = valores.filter((x) => typeof x === 'number' && Number.isFinite(x));
  if (!v.length) return null;
  return Math.round((v.reduce((s, x) => s + x, 0) / v.length) * 10) / 10;
}

// Mesma conta dos concorrentes (curtidas + comentários). Sem nenhum dos dois: null.
function curtidasMaisComentarios(p) {
  if (p.curtidas == null && p.comentarios == null) return null;
  return (p.curtidas || 0) + (p.comentarios || 0);
}

function horaBR(iso) {
  return new Date(Date.parse(iso) - 3 * 3600 * 1000).getUTCHours();
}

function resumoPorTipo(lista) {
  const grupos = {};
  for (const p of lista) (grupos[p.tipo] = grupos[p.tipo] || []).push(p);
  const saida = {};
  for (const [tipo, itens] of Object.entries(grupos)) {
    saida[tipo] = {
      quantidade: itens.length,
      alcanceMedio: media(itens.map((p) => p.alcance)),
      engajamentoMedio: media(itens.map((p) => p.engajamento)),
      mediaCurtidasMaisComentarios: media(itens.map(curtidasMaisComentarios))
    };
  }
  return saida;
}

// Os números que vão para a IA. Tudo calculado aqui; o que a Meta não deu fica null.
async function montarDados({ orgId, contaId, ini, fim, agora, cfg, f }) {
  const m = await metricas.consultarMetricas({ orgId, ini, fim, cfg, f, contaId });
  if (contaId && !m.listaContas.some((c) => c.id === contaId)) {
    throw new ErroIA('Conta não encontrada nesta organização.', 400);
  }
  const todas = await publicacoes.consultarPublicacoes({ orgId, contaId, ordem: 'data', limite: MAX_PUBLICACOES, cfg, f });
  const noPeriodo = todas.publicacoes.filter((p) => {
    const dia = diaBR(Date.parse(p.publicadoEm));
    return dia >= ini && dia <= fim;
  });
  const contas = m.listaContas.filter((c) => !contaId || c.id === contaId).map((c) => c.username);

  const lista = await concorrentes.listarConcorrentes({ orgId, cfg, f });
  const resumoConcorrentes = lista.filter((c) => c.ultimo).map((c) => ({
    perfil: c.handle,
    capturadoEm: diaBR(Date.parse(c.ultimo.capturadoEm)),
    seguidores: c.ultimo.seguidores,
    publicacoes30d: c.ultimo.publicacoes30d,
    engajamentoMedio: c.ultimo.engajamentoMedio,
    tipos: c.ultimo.tipos
  }));

  const topo = (lista2) => (lista2 || []).slice(0, 3).map((x) => ({ rotulo: x.rotulo, pct: x.pct }));
  const publico = m.publico
    ? { atualizadoEm: m.publico.snapshot, idade: topo(m.publico.idade), genero: topo(m.publico.genero), cidades: topo(m.publico.cidades) }
    : null;
  const horarios = m.melhoresHorarios && m.melhoresHorarios.suficiente
    ? { suficiente: true, publicacoesComMedicao: m.melhoresHorarios.posts, top: m.melhoresHorarios.top.slice(0, 3) }
    : { suficiente: false, publicacoesComMedicao: m.melhoresHorarios ? m.melhoresHorarios.posts : 0, top: [] };

  return {
    periodo: { ini, fim, dias: m.dias },
    contaAnalisada: contaId ? (contas[0] || null) : 'todas as contas do Instagram',
    contas,
    visao: {
      diasComDados: m.serie.length,
      totais: m.totais,
      periodoAnterior: m.anteriores,
      seguidoresNoFim: m.seguidoresFim,
      saldoSeguidores: m.saldoSeguidores
    },
    publicacoes: {
      quantidade: noPeriodo.length,
      limiteDaColeta: MAX_PUBLICACOES,
      mediaCurtidasMaisComentarios: media(noPeriodo.map(curtidasMaisComentarios)),
      porTipo: resumoPorTipo(noPeriodo),
      lista: noPeriodo.slice(0, MAX_LISTA_PEDIDO).map((p) => ({
        tipo: p.tipo,
        data: diaBR(Date.parse(p.publicadoEm)),
        hora: horaBR(p.publicadoEm),
        alcance: p.alcance,
        visualizacoes: p.visualizacoes,
        curtidas: p.curtidas,
        comentarios: p.comentarios,
        salvamentos: p.salvamentos,
        compartilhamentos: p.compartilhamentos,
        engajamento: p.engajamento,
        seguidoresGerados: p.seguidoresGerados
      }))
    },
    horarios,
    publico,
    concorrentes: resumoConcorrentes
  };
}

const SISTEMA = `Você analisa dados de redes sociais de pequenos negócios brasileiros para quem administra o painel.

Regras:
1. Use só os números e fatos do JSON recebido. Não invente, não estime e não complete com médias de mercado.
2. Campo null ou ausente significa "dado não disponível". Diga isso. Nunca trate como zero.
3. Cite o número que sustenta cada afirmação (exemplo: "engajamento médio de 15,3 nos posts de feed").
4. Compare só o que é comparável. "mediaCurtidasMaisComentarios" da conta e "engajamentoMedio" dos concorrentes usam a mesma conta (curtidas + comentários). Alcance e visualizações de concorrentes não estão disponíveis: não compare.
5. Se a amostra for pequena (poucas publicações), diga isso e limite as conclusões.
6. Não sugira ações que dependem de dados que não existem.
7. Escreva em português do Brasil, direto, sem jargão.

Responda somente com JSON neste formato:
{"resumo": "texto curto", "pontos_fortes": ["..."], "pontos_de_atencao": ["..."], "proximos_passos": ["..."], "limitacoes": ["..."]}
Cada lista tem no máximo 4 itens. Se não houver o que dizer numa lista, deixe-a vazia.`;

// Chama a OpenAI com a mesma ordem de modelos do resto do projeto (auto-content).
async function chamarIA({ apiKey, env, f, sistema, usuario }) {
  const modelos = [...new Set([env.OPENAI_TEXT_MODEL, 'gpt-4.1', 'gpt-4o'].filter(Boolean))];
  let detalhe = 'sem resposta';
  for (const modelo of modelos) {
    const r = await f(`${OPENAI_URL}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelo,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: semSobras(sistema) }, { role: 'user', content: semSobras(usuario) }]
      })
    });
    if (!r.ok) { detalhe = `${modelo} ${r.status}`; continue; }
    const dados = await r.json();
    const conteudo = dados.choices && dados.choices[0] && dados.choices[0].message && dados.choices[0].message.content;
    if (conteudo) return { texto: conteudo, modelo };
    detalhe = `${modelo}: resposta vazia`;
  }
  throw new ErroIA('A IA não respondeu agora. Tente de novo em alguns minutos.', 502, detalhe);
}

const CAMPOS_LISTA = ['pontos_fortes', 'pontos_de_atencao', 'proximos_passos', 'limitacoes'];

// Aceita só o formato pedido. Cada texto tem limite de tamanho e é cortado por caractere.
function validarResposta(texto) {
  let obj;
  try { obj = JSON.parse(texto); } catch (e) { throw new ErroIA('A IA não devolveu uma análise válida. Tente de novo.', 502, 'JSON inválido'); }
  if (!obj || typeof obj !== 'object') throw new ErroIA('A IA não devolveu uma análise válida. Tente de novo.', 502, 'JSON sem objeto');
  const resumo = typeof obj.resumo === 'string' ? cortar(obj.resumo.trim(), 1200) : '';
  if (!resumo) throw new ErroIA('A IA não devolveu uma análise válida. Tente de novo.', 502, 'sem resumo');
  const saida = { resumo };
  for (const campo of CAMPOS_LISTA) {
    const lista = Array.isArray(obj[campo]) ? obj[campo] : [];
    saida[campo] = lista
      .filter((x) => typeof x === 'string' && x.trim())
      .map((x) => cortar(x.trim(), 400))
      .slice(0, 4);
  }
  return saida;
}

async function gravarAnalise({ cfg, f, orgId, userId, contaId, ini, fim, dados, status, analise, modelo }) {
  const linhas = await rest(cfg, f, 'POST', 'ai_analyses', {
    organization_id: orgId,
    social_account_id: contaId,
    requested_by: userId,
    kind: 'periodo',
    period_start: ini,
    period_end: fim,
    input_summary: dados,
    output: JSON.stringify(analise),
    status,
    model: modelo
  }, { Prefer: 'return=representation' });
  return linhas && linhas[0] ? linhas[0] : null;
}

const VAZIA = { resumo: '', pontos_fortes: [], pontos_de_atencao: [], proximos_passos: [], limitacoes: [] };

// Gera e guarda a análise. Retorna a linha gravada e o que foi enviado (para a tela mostrar).
async function analisarPeriodo({ orgId, userId, contaId = null, ini, fim, cfg, f, env, agora }) {
  const dados = await montarDados({ orgId, contaId, ini, fim, agora, cfg, f });
  const base = { cfg, f, orgId, userId, contaId, ini, fim, dados };

  if (dados.visao.diasComDados === 0 && dados.publicacoes.quantidade === 0) {
    const analise = { ...VAZIA, limitacoes: ['Não há dados sincronizados neste período. Sincronize as contas ou escolha outro período.'] };
    const linha = await gravarAnalise({ ...base, status: 'insufficient_data', analise, modelo: null });
    return resultado(linha, analise, null, dados);
  }

  let analise;
  let modelo = null;
  try {
    const r = await chamarIA({ apiKey: env.OPENAI_API_KEY, env, f, sistema: SISTEMA, usuario: `Dados do período (JSON):\n${JSON.stringify(dados)}` });
    modelo = r.modelo;
    analise = validarResposta(r.texto);
  } catch (e) {
    const erro = e instanceof ErroIA ? e : new ErroIA('Não foi possível gerar a análise. Tente de novo.', 502, e.message);
    console.error('analise-ia:', erro.detalhe || erro.message);
    await gravarAnalise({ ...base, status: 'error', analise: { ...VAZIA, limitacoes: [erro.message] }, modelo: null });
    throw erro;
  }
  const linha = await gravarAnalise({ ...base, status: 'ok', analise, modelo });
  return resultado(linha, analise, modelo, dados);
}

function resultado(linha, analise, modelo, dados) {
  return {
    id: linha ? linha.id : null,
    status: linha ? linha.status : 'ok',
    analise,
    modelo,
    criadaEm: linha ? linha.created_at : null,
    periodo: { ini: dados.periodo.ini, fim: dados.periodo.fim },
    enviado: { dias: dados.visao.diasComDados, publicacoes: dados.publicacoes.quantidade, contas: dados.contas, concorrentes: dados.concorrentes.length }
  };
}

// Últimas análises da organização, do mais recente para o mais antigo.
async function listarAnalises({ orgId, cfg, f }) {
  const linhas = await rest(cfg, f, 'GET',
    `ai_analyses?select=id,status,period_start,period_end,output,model,created_at,social_account_id` +
    `&organization_id=eq.${encodeURIComponent(orgId)}&kind=eq.periodo&order=created_at.desc&limit=20`) || [];
  return linhas.map((l) => {
    let analise = null;
    try { analise = JSON.parse(l.output || 'null'); } catch (e) { analise = null; }
    return {
      id: l.id,
      status: l.status,
      periodo: { ini: l.period_start, fim: l.period_end },
      analise,
      modelo: l.model || null,
      criadaEm: l.created_at,
      contaId: l.social_account_id || null
    };
  });
}

module.exports = { ErroIA, analisarPeriodo, listarAnalises, validarResposta, resumoPorTipo, media, curtidasMaisComentarios, SISTEMA };
