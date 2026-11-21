// Executa os arquivos reais da análise por empresa (analise-insights.js, analise-app.js, analise-paginas.js)
// num contexto simulado, com a API e os elementos da página simulados. Confere cada aba interna com
// dados de exemplo e pega erro de variável ou de template sem abrir o navegador. Sem rede.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const raiz = path.join(__dirname, '..');
const arquivos = ['analise-insights.js', 'analise-app.js', 'analise-paginas.js'];

// Elementos da página que o código procura pelo id (os que existem no index.html).
// Elemento falso com o mesmo formato que o navegador usa (innerHTML e classList).
const novoElemento = (id) => ({ id, innerHTML: '', classList: { add() {}, remove() {}, toggle() {} } });
const elementos = {
  'pa-academia': novoElemento('pa-academia'),
  'pa-sorveteria': novoElemento('pa-sorveteria'),
  'pa-gympulse': novoElemento('pa-gympulse')
};

const contexto = {
  console,
  setTimeout, clearTimeout,
  location: { search: '', pathname: '/', hash: '', origin: 'https://painel.test' },
  history: { replaceState() {} },
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  document: {
    readyState: 'complete',
    getElementById: (id) => elementos[id] || null,
    querySelector: () => null,
    addEventListener() {},
    createElement: () => ({ style: {}, setAttribute() {} }),
    body: { appendChild() {}, dataset: {} }
  },
  window: {},
  fetch: async () => { throw new Error('fetch não configurado'); },
  Chart: undefined,
  URLSearchParams,
  Blob: function () {},
  URL: { createObjectURL: () => '', revokeObjectURL() {} },
  confirm: () => false,
  todayBR: () => '2026-11-21',
  AnaliseDemo: { addDays: (ds, n) => new Date(Date.parse(ds + 'T12:00:00Z') + n * 86400000).toISOString().slice(0, 10) },
  SUPABASE_URL: 'https://projeto.supabase.test',
  SUPABASE_KEY: 'chave-publica-de-teste',
  go: () => {},
  Promise, Math, Date, JSON, Number, String, Object, Array, Set, Map, Intl
};
contexto.window = contexto;
contexto.globalThis = contexto;
vm.createContext(contexto);
for (const nome of arquivos) {
  vm.runInContext(fs.readFileSync(path.join(raiz, nome), 'utf8'), contexto, { filename: nome });
}

// PZ e PZ_EMPRESAS são 'const' no topo do script: leio pelo vm.
const PZ = vm.runInContext('PZ', contexto);
const PZ_EMPRESAS = vm.runInContext('PZ_EMPRESAS', contexto);
const run = (expr) => vm.runInContext(expr, contexto);

const semLixo = (html, onde) => {
  assert.ok(typeof html === 'string' && html.length > 20, onde + ': HTML vazio');
  assert.ok(!/undefined|NaN|\[object Object\]/.test(html), onde + ': apareceu undefined/NaN/[object Object]');
};
const espera = (ms = 30) => new Promise((r) => setTimeout(r, ms));

// ── Dados de exemplo, no formato que a API devolve ───────────────────────────
const serie = [
  { data: '2026-11-19', alcance: 120, visualizacoes: 150, engajamento: 12, cliques: 3, seguidores: 1002 },
  { data: '2026-11-20', alcance: 130, visualizacoes: 140, engajamento: 13, cliques: 4, seguidores: 1004 },
  { data: '2026-11-21', alcance: 150, visualizacoes: 160, engajamento: 15, cliques: 5, seguidores: 1010 }
];
const metricas = {
  ini: '2026-11-19', fim: '2026-11-21', dias: 3, serie,
  totais: { alcance: 400, visualizacoes: 450, engajamento: 40, cliques: 12 },
  anteriores: { alcance: 300, visualizacoes: 350, engajamento: 40, cliques: 9 },
  seguidoresFim: 1010, saldoSeguidores: 8,
  melhoresHorarios: { suficiente: true, posts: 12, top: [{ dia: 'Qua', hora: 19, media: 33.5, posts: 4 }] },
  publico: {
    snapshot: '2026-11-20',
    idade: [{ rotulo: '25-34', pct: 40 }, { rotulo: '18-24', pct: 35 }],
    genero: [{ rotulo: 'Feminino', pct: 70 }, { rotulo: 'Masculino', pct: 30 }],
    cidades: [{ rotulo: 'Turvo', pct: 60 }], paises: [{ rotulo: 'BR', pct: 100 }]
  }
};
const pubs = [
  { id: 'a', tipo: 'reel', tipoLabel: 'Reel', conta: 'planetacorpoclubmais', publicadoEm: '2026-11-18T15:00:00Z', legenda: 'Treino de hoje', alcance: 500, curtidas: 40, comentarios: 4, engajamento: 47, permalink: 'https://www.instagram.com/reel/1/', miniatura: null },
  { id: 'b', tipo: 'post', tipoLabel: 'Post', conta: 'planetacorpoclubmais', publicadoEm: '2026-11-19T12:00:00Z', legenda: 'Outra', alcance: 300, curtidas: 20, comentarios: 6, engajamento: 27, permalink: null, miniatura: null }
];
const contasAPI = [
  { id: 'c1', platform: 'instagram', username: 'planetacorpoclubmais', status: 'active', empresa: 'academia', last_synced_at: '2026-11-21T11:00:00Z' },
  { id: 'c2', platform: 'instagram', username: 'sorvetesguriturvo', status: 'active', empresa: null, last_synced_at: null },
  { id: 'c3', platform: 'facebook', username: null, display_name: 'Academia Planeta', status: 'active', empresa: 'academia', last_synced_at: null }
];
const concorrentesAPI = [
  { id: 'k1', handle: 'concorrente.x', displayName: 'Concorrente X', empresa: 'academia', ultimo: { capturadoEm: '2026-11-20T12:00:00Z', seguidores: 1200, totalPublicacoes: 210, publicacoes30d: 3, engajamentoMedio: 15.3, amostra: 4, tipos: { post: 2 }, ultimaPublicacaoEm: '2026-11-19T10:00:00Z' }, historico: [{ data: '2026-11-19', seguidores: 1190 }, { data: '2026-11-20', seguidores: 1200 }] },
  { id: 'k2', handle: 'outro.perfil', displayName: null, empresa: null, ultimo: null, historico: [] }
];
const iaAPI = { papel: 'owner', analises: [
  { id: 'ia1', status: 'ok', periodo: { ini: '2026-11-14', fim: '2026-11-20' }, criadaEm: '2026-11-21T15:00:00Z', modelo: 'gpt-4.1', contaId: 'c1', analise: { resumo: 'Alcance estável nos dois últimos dias.', pontos_fortes: ['Reels'], pontos_de_atencao: [], proximos_passos: ['Publicar mais'], limitacoes: [] } }
] };

const respostas = {
  contas: { ok: true, role: 'owner', accounts: contasAPI },
  metricas,
  publicacoes: { publicacoes: pubs, contas: [] },
  concorrentes: { ok: true, papel: 'owner', concorrentes: concorrentesAPI, avisoConsulta: null },
  'ia-historico': iaAPI
};
let chamadasContas = 0;
contexto.fetch = async (url) => {
  const acao = /acao=([\w-]+)/.exec(url)[1];
  if (acao === 'contas') chamadasContas += 1;
  await espera(3);
  return { ok: true, status: 200, json: async () => respostas[acao], text: async () => '' };
};

// ── Sessão simulada ─────────────────────────────────────────────────────────
PZ.sessao = { user: { email: 'gilson@empresa.com' }, access_token: 't' };
PZ.orgs = [{ id: 'o1', nome: 'Grupo', papel: 'owner' }];
PZ.org = 'o1';
PZ.iniciado = true;
PZ.orgsCarregadas = true;
const emp = PZ_EMPRESAS[0];

(async () => {
  // 1) Telas puras com dados de exemplo
  const visao = run("pzHtmlVisao")(metricas, pubs);
  semLixo(visao, 'visão');
  assert.ok(visao.includes('pz-ch-evo') && visao.includes('pz-ch-seg'), 'visão tem os dois gráficos');
  assert.ok(visao.includes('+33'), 'alcance: 400 contra 300 = +33%');
  assert.ok(visao.includes('Qua'), 'melhor horário aparece');

  const folha = run("pzHtmlRelatorio")({
    tipo: 'semanal', titulo: 'Relatório semanal',
    periodo: { ini: '2026-11-14', fim: '2026-11-20', dias: 7 }, periodoAnterior: { ini: '2026-11-07', fim: '2026-11-13' },
    escopo: '@planetacorpoclubmais', geradoEm: '2026-11-21T15:00:00Z', semDados: false,
    indicadores: [{ chave: 'alcance', rotulo: 'Alcance', valor: 400, anterior: 300, variacao: 33.3 }, { chave: 'cliques', rotulo: 'Cliques no link', valor: null, anterior: null, variacao: null }],
    seguidores: { noFim: 1010, saldo: 8 }, diario: serie, publicacoes: [{ tipo: 'Reel', data: '2026-11-18', hora: 12, conta: 'planetacorpoclubmais', alcance: 500, curtidas: 40, comentarios: 4, engajamento: 47 }],
    concorrentes: [], horarios: { suficiente: false, publicacoesComMedicao: 3, top: [] }, publico: null,
    limitacoes: ['Impressões: a Meta descontinuou a métrica.']
  });
  semLixo(folha, 'relatório');
  assert.ok(folha.includes('Cliques no link') && folha.includes('Relatório semanal'));

  const analise = run("pzHtmlAnaliseIA")(iaAPI.analises[0]);
  semLixo(analise, 'análise com IA');
  assert.ok(analise.includes('Alcance estável nos dois últimos dias.'));

  semLixo(run("pzHtmlLogin")(), 'login');
  semLixo(run("pzHtmlSemOrg")(), 'sem organização');
  semLixo(run("pzHtmlCab")(emp), 'cabeçalho da empresa');
  assert.ok(run("pzHtmlCab")(emp).includes('Academia'));
  semLixo(run("pzKpi")('Alcance', '400', { delta: 33.3, serie: [1, 2, 3] }), 'indicador');
  semLixo(run("pzKpi")('Alcance', 'n/d', { delta: null }), 'indicador sem comparação');
  semLixo(run("pzPostCard")(pubs[0], 47), 'card de publicação');
  semLixo(run("pzHtmlDestaques")(run("AnInsights").destaques({ totais: metricas.totais, anteriores: metricas.anteriores, publicacoes: pubs, horarios: metricas.melhoresHorarios, saldoSeguidores: 8, dias: 3 })), 'destaques');

  // 2) Uma empresa com conta: as abas internas, com a conta dela
  const sec = async (sub) => {
    const el = { innerHTML: '' };
    await run('(el, id, sub, tok) => pzPaginaEmpresa(el, id, sub, tok)')(el, 'academia', sub, PZ.token);
    await espera(5);
    return el.innerHTML;
  };
  const visaoTela = await sec('visao');
  semLixo(visaoTela, 'aba visão');
  assert.ok(visaoTela.includes('Alcance') && visaoTela.includes('planetacorpoclubmais'), 'visão da empresa mostra a conta dela');
  semLixo(await sec('publico'), 'aba público');
  assert.ok((await sec('publico')).includes('Faixa etária'));
  semLixo(await sec('publicacoes'), 'aba publicações');
  assert.ok((await sec('publicacoes')).includes('Treino de hoje'), 'publicações da conta aparecem');
  semLixo(await sec('horarios'), 'aba horários');
  const concorr = await sec('concorrentes');
  semLixo(concorr, 'aba concorrentes');
  assert.ok(concorr.includes('@concorrente.x'), 'concorrente da empresa aparece');
  assert.ok(!concorr.includes('@outro.perfil'), 'concorrente sem empresa não aparece na aba da empresa');
  const relatorios = await sec('relatorios');
  semLixo(relatorios, 'aba relatórios');
  assert.ok(relatorios.includes('Gerar relatório') && relatorios.includes('planetacorpoclubmais'));
  const ia = await sec('ia');
  semLixo(ia, 'aba inteligência');
  assert.ok(ia.includes('Alcance estável nos dois últimos dias.'), 'a análise da conta da empresa aparece');
  const contas = await sec('contas');
  semLixo(contas, 'aba contas');
  assert.ok(contas.includes('Conectar Instagram') && contas.includes('Contas sem empresa'), 'contas: conectar e ligar contas sem empresa');
  assert.ok(contas.includes('sorvetesguriturvo'), 'conta sem empresa aparece para ligar');
  assert.ok(contas.includes('Concorrentes sem empresa') && contas.includes('outro.perfil'), 'concorrente sem empresa aparece para ligar');

  // 3) Empresa sem conta do Instagram: explica em vez de mostrar zero ou exemplo
  const semConta = { innerHTML: '' };
  await run('(el, id, sub, tok) => pzPaginaEmpresa(el, id, sub, tok)')(semConta, 'sorveteria', 'visao', PZ.token);
  await espera(5);
  assert.ok(semConta.innerHTML.includes('ainda não tem conta do Instagram'), 'sem conta: diz o que falta');
  assert.ok(!/Alcance/.test(semConta.innerHTML), 'sem conta: nenhum indicador de exemplo');

  // 4) Carregamento completo: o painel da empresa monta cabeçalho, abas e a página
  PZ.empresa = 'academia';
  PZ.sub = { academia: 'visao' };
  PZ.token = 0;
  elementos['pz-pagina'] = novoElemento('pz-pagina');
  run('pzRender')();
  await espera(60);
  const painel = elementos['pa-academia'].innerHTML;
  semLixo(painel, 'painel da academia');
  assert.ok(painel.includes('pz-sub') && painel.includes('Visão geral') && painel.includes('Contas'), 'abas internas aparecem');
  const pagina = elementos['pz-pagina'].innerHTML;
  semLixo(pagina, 'página da visão geral');
  assert.ok(pagina.includes('Alcance'), 'a página da visão geral chegou ao painel');

  // 5) Pedidos iguais em paralelo viram uma só busca
  PZ.cache = {};
  chamadasContas = 0;
  await Promise.all([run('pzContas')(), run('pzContas')()]);
  assert.strictEqual(chamadasContas, 1, 'dois pedidos iguais fazem uma só chamada');

  console.log('ok (analise-render)');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
