// Executa os arquivos reais da Análise (analise-insights.js, analise-app.js, analise-paginas.js) num
// contexto simulado e renderiza as telas com dados de exemplo. Pega erro de variável e de template
// sem precisar abrir o navegador. Sem rede: o fetch e o Supabase não são chamados aqui.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const raiz = path.join(__dirname, '..');
const arquivos = ['analise-insights.js', 'analise-app.js', 'analise-paginas.js'];

const contexto = {
  console,
  setTimeout, clearTimeout,
  location: { search: '', pathname: '/', hash: '' },
  history: { replaceState() {} },
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  document: {
    readyState: 'complete',
    getElementById: () => null,
    querySelector: () => null,
    addEventListener() {},
    createElement: () => ({ style: {}, setAttribute() {} }),
    body: { appendChild() {}, dataset: {} }
  },
  window: {},
  fetch: async () => { throw new Error('fetch não deve ser chamado nesta simulação'); },
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

// PZ e PZ_EMPRESAS são 'const' no topo do script: não viram propriedades do contexto, então leio pelo vm.
const PZ = vm.runInContext('PZ', contexto);
const PZ_EMPRESAS = vm.runInContext('PZ_EMPRESAS', contexto);

const semLixo = (html, onde) => {
  assert.ok(typeof html === 'string' && html.length > 20, onde + ': HTML vazio');
  assert.ok(!/undefined|NaN|\[object Object\]/.test(html), onde + ': apareceu undefined/NaN/[object Object]');
};

// Dados de exemplo no formato que a API devolve.
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
  { id: 'a', tipo: 'reel', tipoLabel: 'Reel', conta: 'academia', publicadoEm: '2026-11-18T15:00:00Z', legenda: 'Treino de hoje', alcance: 500, curtidas: 40, comentarios: 4, engajamento: 47, permalink: 'https://www.instagram.com/reel/1/', miniatura: null },
  { id: 'b', tipo: 'post', tipoLabel: 'Post', conta: 'academia', publicadoEm: '2026-11-19T12:00:00Z', legenda: 'Outra', alcance: 300, curtidas: 20, comentarios: 6, engajamento: 27, permalink: null, miniatura: null }
];

// 1) Visão da empresa, com dados
PZ.sessao = { user: { email: 'gilson@empresa.com' } };
PZ.orgs = [{ id: 'o1', nome: 'Grupo', papel: 'owner' }];
PZ.org = 'o1';
PZ.iniciado = true;
const visao = contexto.pzHtmlVisao(metricas, pubs, 0);
semLixo(visao, 'visão');
assert.ok(visao.includes('pz-ch-evo') && visao.includes('pz-ch-seg'), 'visão tem os dois gráficos');
assert.ok(visao.includes('+33,3%') || visao.includes('+33.3%'), 'alcance: 400 contra 300 = +33%');
assert.ok(visao.includes('Melhores horários') && visao.includes('Qua'), 'horários aparecem');
assert.ok(visao.includes('Reel'), 'publicação em destaque aparece');

// 2) Público: com dados e sem dados
semLixo(contexto.pzHtmlPublico(metricas, 0), 'público');
const semPublico = contexto.pzHtmlPublico({ ...metricas, publico: null }, 0);
semLixo(semPublico, 'público sem dados');
assert.ok(semPublico.includes('100 seguidores'), 'sem público, explica o limite da Meta');

// 3) Horários: suficiente e insuficiente
semLixo(contexto.pzHtmlHorarios(metricas), 'horários');
const poucos = contexto.pzHtmlHorarios({ ...metricas, melhoresHorarios: { suficiente: false, posts: 3, top: [] } });
semLixo(poucos, 'horários com pouca base');
assert.ok(poucos.includes('Hoje há 3'), 'mostra quantas publicações faltam');

// 4) Publicações com filtro e lista vazia
semLixo(contexto.pzHtmlPublicacoes({ ok: true, dados: { publicacoes: pubs } }), 'publicações');
semLixo(contexto.pzHtmlPublicacoes({ ok: true, dados: { publicacoes: [] } }), 'publicações vazias');
semLixo(contexto.pzHtmlPublicacoes({ ok: false, erro: 'falhou' }), 'publicações com erro');

// 5) Relatório (folha) e análise com IA
const relatorio = {
  tipo: 'semanal', titulo: 'Relatório semanal',
  periodo: { ini: '2026-11-14', fim: '2026-11-20', dias: 7 },
  periodoAnterior: { ini: '2026-11-07', fim: '2026-11-13' },
  escopo: 'todas as contas do Instagram', geradoEm: '2026-11-21T15:00:00Z', semDados: false,
  indicadores: [{ chave: 'alcance', rotulo: 'Alcance', valor: 400, anterior: 300, variacao: 33.3 }, { chave: 'cliques', rotulo: 'Cliques no link', valor: null, anterior: null, variacao: null }],
  seguidores: { noFim: 1010, saldo: 8 },
  diario: serie.map((d) => ({ ...d, data: d.data })),
  publicacoes: [{ tipo: 'Reel', data: '2026-11-18', hora: 12, conta: 'academia', alcance: 500, curtidas: 40, comentarios: 4, engajamento: 47 }],
  concorrentes: [], horarios: { suficiente: false, publicacoesComMedicao: 3, top: [] }, publico: null,
  limitacoes: ['Impressões: a Meta descontinuou a métrica.']
};
const folha = contexto.pzHtmlRelatorio(relatorio);
semLixo(folha, 'relatório');
assert.ok(folha.includes('Relatório semanal') && folha.includes('Cliques no link'), 'folha traz título e indicadores');
const analise = contexto.pzHtmlAnaliseIA({ status: 'ok', periodo: { ini: '2026-11-14', fim: '2026-11-20' }, criadaEm: '2026-11-21T15:00:00Z', modelo: 'gpt-4.1', analise: { resumo: 'Alcance estável.', pontos_fortes: ['Reels'], pontos_de_atencao: [], proximos_passos: ['Publicar mais'], limitacoes: [] } });
semLixo(analise, 'análise com IA');
assert.ok(analise.includes('Alcance estável.') && analise.includes('Pontos fortes'));
const semDados = contexto.pzHtmlAnaliseIA({ status: 'insufficient_data', periodo: { ini: '2026-11-14', fim: '2026-11-20' }, criadaEm: '2026-11-21T15:00:00Z', analise: { limitacoes: ['Sem dados sincronizados.'] } });
semLixo(semDados, 'análise sem dados');
assert.ok(semDados.includes('Dados insuficientes'));

// 6) Componentes genéricos e telas de entrada
semLixo(contexto.pzKpi('Alcance', '400', { delta: 33.3, serie: [1, 2, 3] }), 'indicador');
semLixo(contexto.pzKpi('Alcance', 'n/d', { delta: null }), 'indicador sem comparação');
semLixo(contexto.pzRanking([{ rotulo: 'Reels', valor: 40 }, { rotulo: 'Posts', valor: null }], (v) => contexto.AnInsights.fmtDec(v), ' interações'), 'ranking');
semLixo(contexto.pzPostCard(pubs[0], 47), 'card de publicação');
semLixo(contexto.pzHtmlDestaques(contexto.AnInsights.destaques({ totais: metricas.totais, anteriores: metricas.anteriores, publicacoes: pubs, horarios: metricas.melhoresHorarios, saldoSeguidores: 8, dias: 3 })), 'destaques');
semLixo(contexto.pzHtmlLogin(), 'login');
semLixo(contexto.pzHtmlSemOrg(), 'sem organização');
semLixo(contexto.pzHtmlTopo(), 'topo');
semLixo(contexto.pzHtmlRail(), 'menu lateral');
semLixo(contexto.pzVazio('🖼️', 'Vazio', 'Texto'), 'vazio');
semLixo(contexto.pzAviso('erro', 'Erro', 'Texto'), 'aviso');

// 7) Página de empresa: estrutura de contas e a lista de contas da empresa
const dadosContas = { accounts: [
  { id: 'c1', platform: 'instagram', username: 'planetacorpoclubmais', status: 'active', empresa: 'academia', last_synced_at: '2026-11-21T11:00:00Z' },
  { id: 'c2', platform: 'facebook', username: null, display_name: 'Academia Planeta', status: 'active', empresa: 'academia', last_synced_at: null }
] };
const emp = PZ_EMPRESAS[0];
semLixo(contexto.pzContasEmpresa(emp, dadosContas), 'contas da empresa');
semLixo(contexto.pzCabecalhoEmpresa(emp, dadosContas), 'cabeçalho da empresa');
assert.strictEqual(contexto.pzContaDaEmpresa(dadosContas, 'academia'), 'c1', 'a conta do Instagram é a das análises');

console.log('ok (analise-render)');
