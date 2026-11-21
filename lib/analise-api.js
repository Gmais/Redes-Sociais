// Handlers da Análise das Redes Sociais (chamados por api/analise.js).
//   POST meta-iniciar  -> admin+ da organização recebe a URL de login da Meta.
//   GET  meta-callback -> retorno da Meta: confere o estado, troca o código e grava as contas.
//   GET  contas        -> viewer+ lista as contas conectadas (sem tokens).

const crypto = require('crypto');
const { ErroHttp, exigirPapel, papelNaOrganizacao, configSupabase } = require('./supabase-server');
const meta = require('./meta-oauth');

function responder(res, status, corpo) {
  res.status(status).json(corpo);
}

function redirecionar(res, url) {
  res.writeHead(302, { Location: url });
  res.end();
}

function lerCorpo(req) {
  return new Promise((resolve, reject) => {
    let dados = '';
    req.on('data', (pedaco) => { dados += pedaco; });
    req.on('end', () => resolve(dados));
    req.on('error', reject);
  });
}

const VARIAVEIS_META = ['META_APP_ID', 'META_APP_SECRET', 'META_REDIRECT_URI', 'TOKEN_ENCRYPTION_KEY', 'APP_URL'];

function faltando(env, nomes) {
  return nomes.filter((n) => !env[n]);
}

async function iniciarMeta(req, res, deps) {
  if (req.method !== 'POST') return responder(res, 405, { error: 'Método não permitido' });
  try {
    let corpo = {};
    try { corpo = JSON.parse((await lerCorpo(req)) || '{}'); } catch (e) { return responder(res, 400, { error: 'corpo inválido' }); }
    const acesso = await exigirPapel(req, corpo.orgId, 'admin', deps);
    const env = deps.env;
    const ausentes = faltando(env, ['META_APP_ID', 'META_REDIRECT_URI', 'TOKEN_ENCRYPTION_KEY']);
    if (ausentes.length) return responder(res, 500, { error: 'Configure no Vercel: ' + ausentes.join(', ') });
    const estado = meta.criarEstado({
      orgId: acesso.organizationId, userId: acesso.user.id, chave: env.TOKEN_ENCRYPTION_KEY, agora: deps.agora()
    });
    return responder(res, 200, {
      url: meta.urlDeLogin({ appId: env.META_APP_ID, redirectUri: env.META_REDIRECT_URI, estado, configId: env.META_LOGIN_CONFIG_ID || undefined })
    });
  } catch (e) {
    if (e instanceof ErroHttp) return responder(res, e.status, { error: e.message });
    return responder(res, 500, { error: 'Erro ao iniciar a conexão com a Meta' });
  }
}

async function callbackMeta(req, res, deps) {
  if (req.method !== 'GET') return responder(res, 405, { error: 'Método não permitido' });
  const env = deps.env;
  const ausentes = faltando(env, VARIAVEIS_META);
  if (ausentes.length) return responder(res, 500, { error: 'Configure no Vercel: ' + ausentes.join(', ') });

  // Só códigos fixos vão para a URL de volta: nada que venha da Meta é repetido para o navegador.
  const voltar = (motivo) => redirecionar(res, `${env.APP_URL}/?analise=erro&motivo=${motivo}`);
  const q = req.query || {};
  if (q.error) return voltar('recusado');

  let estado;
  try {
    estado = meta.lerEstado(q.state, { chave: env.TOKEN_ENCRYPTION_KEY, agora: deps.agora() });
  } catch (e) {
    return voltar('estado');
  }

  // Confere de novo o papel no momento do retorno (pode ter mudado desde o início).
  const papel = await papelNaOrganizacao(estado.userId, estado.orgId, deps).catch(() => null);
  if (!papel || papel === 'viewer' || papel === 'editor') return voltar('sem_permissao');
  if (!q.code) return voltar('sem_codigo');

  try {
    const f = deps.fetch;
    const token = await meta.trocarCodigo({
      codigo: String(q.code), appId: env.META_APP_ID, appSecret: env.META_APP_SECRET,
      redirectUri: env.META_REDIRECT_URI, f
    });
    const paginas = await meta.listarPaginas({ tokenUsuario: token, appSecret: env.META_APP_SECRET, f });
    const total = await meta.gravarConexoes({
      orgId: estado.orgId, userId: estado.userId, paginas, cfg: deps.config, f, chave: env.TOKEN_ENCRYPTION_KEY
    });
    return redirecionar(res, `${env.APP_URL}/?analise=conectada&paginas=${total.facebook}&contas_ig=${total.instagram}`);
  } catch (e) {
    console.error('meta-callback:', e.message);
    return voltar('meta');
  }
}

async function contasOrganizacao(req, res, deps) {
  if (req.method !== 'GET') return responder(res, 405, { error: 'Método não permitido' });
  try {
    const orgId = (req.query || {}).org;
    const acesso = await exigirPapel(req, orgId, 'viewer', deps);
    const contas = await meta.listarContasDaOrganizacao({ orgId: acesso.organizationId, cfg: deps.config, f: deps.fetch });
    return responder(res, 200, { ok: true, role: acesso.role, accounts: contas || [] });
  } catch (e) {
    if (e instanceof ErroHttp) return responder(res, e.status, { error: e.message });
    return responder(res, 500, { error: 'Erro ao listar as contas' });
  }
}

// ── Login direto do Instagram (sem Página do Facebook) ─────────────────────────
const ig = require('./instagram-login');
const VARIAVEIS_IG = ['INSTAGRAM_APP_ID', 'INSTAGRAM_APP_SECRET', 'INSTAGRAM_REDIRECT_URI', 'TOKEN_ENCRYPTION_KEY', 'APP_URL'];

async function iniciarInstagram(req, res, deps) {
  if (req.method !== 'POST') return responder(res, 405, { error: 'Método não permitido' });
  try {
    let corpo = {};
    try { corpo = JSON.parse((await lerCorpo(req)) || '{}'); } catch (e) { return responder(res, 400, { error: 'corpo inválido' }); }
    const acesso = await exigirPapel(req, corpo.orgId, 'admin', deps);
    const env = deps.env;
    const ausentes = faltando(env, ['INSTAGRAM_APP_ID', 'INSTAGRAM_REDIRECT_URI', 'TOKEN_ENCRYPTION_KEY']);
    if (ausentes.length) return responder(res, 500, { error: 'Configure no Vercel: ' + ausentes.join(', ') });
    const estado = meta.criarEstado({
      orgId: acesso.organizationId, userId: acesso.user.id, chave: env.TOKEN_ENCRYPTION_KEY, agora: deps.agora()
    });
    return responder(res, 200, {
      url: ig.urlDeLoginIG({ appId: env.INSTAGRAM_APP_ID, redirectUri: env.INSTAGRAM_REDIRECT_URI, estado })
    });
  } catch (e) {
    if (e instanceof ErroHttp) return responder(res, e.status, { error: e.message });
    return responder(res, 500, { error: 'Erro ao iniciar o login do Instagram' });
  }
}

async function callbackInstagram(req, res, deps) {
  if (req.method !== 'GET') return responder(res, 405, { error: 'Método não permitido' });
  const env = deps.env;
  const ausentes = faltando(env, VARIAVEIS_IG);
  if (ausentes.length) return responder(res, 500, { error: 'Configure no Vercel: ' + ausentes.join(', ') });

  const voltar = (motivo) => redirecionar(res, `${env.APP_URL}/?analise=erro&motivo=${motivo}`);
  const q = req.query || {};
  if (q.error) return voltar('recusado');

  let estado;
  try {
    estado = meta.lerEstado(q.state, { chave: env.TOKEN_ENCRYPTION_KEY, agora: deps.agora() });
  } catch (e) {
    return voltar('estado');
  }
  const papel = await papelNaOrganizacao(estado.userId, estado.orgId, deps).catch(() => null);
  if (!papel || papel === 'viewer' || papel === 'editor') return voltar('sem_permissao');
  if (!q.code) return voltar('sem_codigo');

  try {
    const f = deps.fetch;
    const { tokenCurto } = await ig.trocarCodigoIG({
      codigo: String(q.code), appId: env.INSTAGRAM_APP_ID, appSecret: env.INSTAGRAM_APP_SECRET,
      redirectUri: env.INSTAGRAM_REDIRECT_URI, f
    });
    const longa = await ig.trocarPorLongaIG({ tokenCurto, appSecret: env.INSTAGRAM_APP_SECRET, f });
    const perfil = await ig.perfilIG({ token: longa.token, f });
    if (!ig.ehContaProfissional(perfil)) return voltar('tipo_conta');
    await ig.gravarContaIG({
      orgId: estado.orgId, userId: estado.userId, perfil, token: longa.token, expiresIn: longa.expiresIn,
      cfg: deps.config, f, chave: env.TOKEN_ENCRYPTION_KEY, agora: deps.agora()
    });
    return redirecionar(res, `${env.APP_URL}/?analise=conectada&tipo=ig&contas_ig=1`);
  } catch (e) {
    console.error('ig-callback:', e.message);
    return voltar('instagram');
  }
}

// ── Sincronização das contas de Instagram (Fase 5) ─────────────────────────────
const sync = require('./sync-instagram');

async function sincronizarOrganizacao(req, res, deps) {
  if (req.method !== 'POST') return responder(res, 405, { error: 'Método não permitido' });
  try {
    let corpo = {};
    try { corpo = JSON.parse((await lerCorpo(req)) || '{}'); } catch (e) { return responder(res, 400, { error: 'corpo inválido' }); }
    const acesso = await exigirPapel(req, corpo.orgId, 'admin', deps);
    const env = deps.env;
    if (!env.TOKEN_ENCRYPTION_KEY) return responder(res, 500, { error: 'Configure no Vercel: TOKEN_ENCRYPTION_KEY' });
    const contas = await meta.rest(deps.config, deps.fetch, 'GET',
      `social_accounts?select=id,organization_id,platform,external_id,parent_external_id,username,status` +
      `&organization_id=eq.${encodeURIComponent(acesso.organizationId)}&platform=eq.instagram&status=eq.active`);
    if (!contas || !contas.length) {
      return responder(res, 200, { ok: true, resultados: [], aviso: 'Nenhuma conta de Instagram ativa para sincronizar.' });
    }
    const resultados = [];
    for (const conta of contas) {
      const r = await sync.sincronizarContaComToken({
        conta, cfg: deps.config, f: deps.fetch, chave: env.TOKEN_ENCRYPTION_KEY, agora: deps.agora(), origem: 'manual'
      });
      resultados.push({
        conta: conta.username || conta.external_id, ok: r.ok, registros: r.registros || 0,
        erro: r.erro || null, avisos: r.avisos || [], tokenRenovado: !!r.tokenRenovado
      });
    }
    return responder(res, 200, { ok: true, resultados });
  } catch (e) {
    if (e instanceof ErroHttp) return responder(res, e.status, { error: e.message });
    return responder(res, 500, { error: 'Erro ao sincronizar' });
  }
}

// ── Callbacks obrigatórios da Meta (desautorização e exclusão de dados) ────────
const cbm = require('./meta-callbacks');

async function lerSignedRequestDoCorpo(req, deps) {
  const corpo = new URLSearchParams((await lerCorpo(req)) || '');
  return cbm.lerSignedRequest(corpo.get('signed_request'), [deps.env.META_APP_SECRET, deps.env.INSTAGRAM_APP_SECRET]);
}

async function callbackDesautorizacao(req, res, deps) {
  if (req.method !== 'POST') return responder(res, 405, { error: 'Método não permitido' });
  let pedido;
  try { pedido = await lerSignedRequestDoCorpo(req, deps); } catch (e) { return responder(res, 400, { error: 'pedido não aceito' }); }
  try {
    await cbm.desautorizar({ userId: pedido.userId, cfg: deps.config, f: deps.fetch });
    return responder(res, 200, { ok: true });
  } catch (e) {
    console.error('desautorizacao:', e.message);
    return responder(res, 500, { error: 'erro ao processar' });
  }
}

async function callbackExclusaoDados(req, res, deps) {
  if (req.method !== 'POST') return responder(res, 405, { error: 'Método não permitido' });
  let pedido;
  try { pedido = await lerSignedRequestDoCorpo(req, deps); } catch (e) { return responder(res, 400, { error: 'pedido não aceito' }); }
  const codigo = crypto.randomUUID();
  try {
    await cbm.excluirDados({ userId: pedido.userId, cfg: deps.config, f: deps.fetch });
    return responder(res, 200, { url: `${deps.env.APP_URL}/exclusao-de-dados.html`, confirmation_code: codigo });
  } catch (e) {
    console.error('exclusao-dados:', e.message);
    return responder(res, 500, { error: 'erro ao processar' });
  }
}

// ── Importação das contas do portfólio (Unified Login / usuário do sistema) ───
const unified = require('./unified-instagram');

async function importarPortfolio(req, res, deps) {
  if (req.method !== 'POST') return responder(res, 405, { error: 'Método não permitido' });
  try {
    let corpo = {};
    try { corpo = JSON.parse((await lerCorpo(req)) || '{}'); } catch (e) { return responder(res, 400, { error: 'corpo inválido' }); }
    const acesso = await exigirPapel(req, corpo.orgId, 'admin', deps);
    const env = deps.env;
    const ausentes = faltando(env, ['INSTAGRAM_SYSTEM_TOKEN', 'TOKEN_ENCRYPTION_KEY']);
    if (ausentes.length) return responder(res, 500, { error: 'Configure no Vercel: ' + ausentes.join(', ') });
    const r = await unified.importarContas({
      orgId: acesso.organizationId, userId: acesso.user.id, token: env.INSTAGRAM_SYSTEM_TOKEN,
      cfg: deps.config, f: deps.fetch, chave: env.TOKEN_ENCRYPTION_KEY
    });
    return responder(res, 200, { ok: true, contas: r.contas, importadas: r.gravadas });
  } catch (e) {
    if (e instanceof ErroHttp) return responder(res, e.status, { error: e.message });
    console.error('importar-portfolio:', e.message);
    return responder(res, 500, { error: 'Não foi possível importar as contas do portfólio. Confira o token do sistema.' });
  }
}

// ── Sincronização diária (chamada pelo cron da Vercel, protegida por CRON_SECRET) ──
function segredoConfere(cabecalho, segredo) {
  const esperado = Buffer.from(`Bearer ${segredo}`, 'utf8');
  const recebido = Buffer.from(String(cabecalho || ''), 'utf8');
  return esperado.length === recebido.length && crypto.timingSafeEqual(esperado, recebido);
}

async function sincronizarTodasCron(req, res, deps) {
  if (req.method !== 'GET') return responder(res, 405, { error: 'Método não permitido' });
  const env = deps.env;
  if (!env.CRON_SECRET) return responder(res, 500, { error: 'Configure no Vercel: CRON_SECRET' });
  if (!segredoConfere((req.headers || {}).authorization, env.CRON_SECRET)) {
    return responder(res, 401, { error: 'não autorizado' });
  }
  if (!env.TOKEN_ENCRYPTION_KEY) return responder(res, 500, { error: 'Configure no Vercel: TOKEN_ENCRYPTION_KEY' });
  try {
    const contas = await meta.rest(deps.config, deps.fetch, 'GET',
      `social_accounts?select=id,organization_id,platform,external_id,parent_external_id,username,status` +
      `&platform=eq.instagram&status=eq.active`) || [];
    const resultados = [];
    for (const conta of contas) {
      const r = await sync.sincronizarContaComToken({
        conta, cfg: deps.config, f: deps.fetch, chave: env.TOKEN_ENCRYPTION_KEY, agora: deps.agora(), origem: 'cron'
      });
      resultados.push({ conta: conta.username || conta.external_id, ok: r.ok, registros: r.registros || 0, erro: r.erro || null, avisos: r.avisos || [] });
    }
    // Concorrentes: uma consulta por concorrente, uma vez por dia. Falha aqui não derruba as contas.
    const concorrentesCron = [];
    try {
      const linhas = await meta.rest(deps.config, deps.fetch, 'GET', 'competitor_accounts?select=organization_id') || [];
      const orgs = [...new Set(linhas.map((x) => x.organization_id))];
      for (const orgId of orgs) {
        try {
          const r = await conc.sincronizarConcorrentes({ orgId, cfg: deps.config, f: deps.fetch, chave: env.TOKEN_ENCRYPTION_KEY, agora: deps.agora() });
          concorrentesCron.push({ org: orgId, ok: r.ok, erro: r.erro || null, consultados: (r.resultados || []).length });
        } catch (e) {
          console.error('concorrentes-cron:', e.message);
          concorrentesCron.push({ org: orgId, ok: false, erro: 'falha ao consultar concorrentes' });
        }
      }
    } catch (e) {
      console.error('concorrentes-cron:', e.message);
    }
    return responder(res, 200, { ok: true, contas: contas.length, resultados, concorrentes: concorrentesCron });
  } catch (e) {
    console.error('sincronizar-cron:', e.message);
    return responder(res, 500, { error: 'Erro na sincronização diária' });
  }
}

// ── Métricas sincronizadas para a Visão geral ──────────────────────────────────
const metricas = require('./metricas');

async function metricasOrganizacao(req, res, deps) {
  if (req.method !== 'GET') return responder(res, 405, { error: 'Método não permitido' });
  try {
    const q = req.query || {};
    const acesso = await exigirPapel(req, q.org, 'viewer', deps);
    const ontem = sync.diaBR(deps.agora() - 86400000); // último dia com dado sincronizado
    const dias = Math.min(Math.max(parseInt(q.dias || '30', 10) || 30, 1), 365);
    const fim = q.fim && q.fim < ontem ? q.fim : ontem;
    const ini = q.ini || metricas.addDias(fim, -(dias - 1));
    const conta = q.conta || null;
    if (conta && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(conta)) {
      return responder(res, 400, { error: 'conta inválida' });
    }
    const r = await metricas.consultarMetricas({
      orgId: acesso.organizationId, ini, fim, cfg: deps.config, f: deps.fetch, contaId: conta
    });
    return responder(res, 200, { ok: true, ...r });
  } catch (e) {
    if (e instanceof ErroHttp) return responder(res, e.status, { error: e.message });
    if (/datas inválidas|período|data inicial/.test(e.message)) return responder(res, 400, { error: e.message });
    console.error('metricas:', e.message);
    return responder(res, 500, { error: 'Erro ao ler as métricas' });
  }
}

// ── Lista de publicações (seção Publicações) ───────────────────────────────────
const publicacoes = require('./publicacoes');

async function publicacoesOrganizacao(req, res, deps) {
  if (req.method !== 'GET') return responder(res, 405, { error: 'Método não permitido' });
  try {
    const q = req.query || {};
    const acesso = await exigirPapel(req, q.org, 'viewer', deps);
    const conta = q.conta || null;
    if (conta && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(conta)) {
      return responder(res, 400, { error: 'conta inválida' });
    }
    const tipo = q.tipo || null;
    if (tipo && !publicacoes.TIPOS.includes(tipo)) return responder(res, 400, { error: 'tipo inválido' });
    const ordem = publicacoes.ORDENS.includes(q.ordem) ? q.ordem : 'data';
    const { publicacoes: lista, contas } = await publicacoes.consultarPublicacoes({
      orgId: acesso.organizationId, contaId: conta, tipo, ordem, cfg: deps.config, f: deps.fetch
    });
    return responder(res, 200, { ok: true, publicacoes: lista, contas });
  } catch (e) {
    if (e instanceof ErroHttp) return responder(res, e.status, { error: e.message });
    console.error('publicacoes:', e.message);
    return responder(res, 500, { error: 'Erro ao ler as publicações' });
  }
}

// ── Concorrentes (Business Discovery, só dados públicos) ───────────────────────
// Leitura: qualquer membro. Cadastrar, remover e atualizar: editor+ (mesma regra da RLS).
const conc = require('./concorrentes');
const UUID_CONC = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function concorrentesOrganizacao(req, res, deps) {
  if (req.method !== 'GET') return responder(res, 405, { error: 'Método não permitido' });
  try {
    const acesso = await exigirPapel(req, (req.query || {}).org, 'viewer', deps);
    const cfg = deps.config;
    const lista = await conc.listarConcorrentes({ orgId: acesso.organizationId, cfg, f: deps.fetch });
    // Avisa a tela se não há conta para fazer a consulta (sem conta ativa ou sem token).
    const env = deps.env;
    let avisoConsulta = null;
    if (lista.length && env.TOKEN_ENCRYPTION_KEY) {
      const consulta = await conc.contaDeConsulta({ orgId: acesso.organizationId, cfg, f: deps.fetch, chave: env.TOKEN_ENCRYPTION_KEY, agora: deps.agora() });
      avisoConsulta = consulta.erro || null;
    }
    return responder(res, 200, { ok: true, papel: acesso.role, concorrentes: lista, avisoConsulta });
  } catch (e) {
    if (e instanceof ErroHttp) return responder(res, e.status, { error: e.message });
    console.error('concorrentes:', e.message);
    return responder(res, 500, { error: 'Erro ao ler os concorrentes' });
  }
}

async function concorrentesAdicionar(req, res, deps) {
  if (req.method !== 'POST') return responder(res, 405, { error: 'Método não permitido' });
  try {
    let corpo = {};
    try { corpo = JSON.parse((await lerCorpo(req)) || '{}'); } catch (e) { return responder(res, 400, { error: 'corpo inválido' }); }
    const acesso = await exigirPapel(req, corpo.orgId, 'editor', deps);
    const handle = conc.normalizarHandle(corpo.handle);
    if (!handle) {
      return responder(res, 400, { error: 'Informe o @ do concorrente: letras, números, ponto e sublinhado, até 30 caracteres.' });
    }
    const env = deps.env;
    if (!env.TOKEN_ENCRYPTION_KEY) return responder(res, 500, { error: 'Configure no Vercel: TOKEN_ENCRYPTION_KEY' });
    const nome = String(corpo.displayName || '').trim().slice(0, 80) || null;
    const novo = await conc.adicionarConcorrente({
      orgId: acesso.organizationId, userId: acesso.user.id, handle, displayName: nome,
      cfg: deps.config, f: deps.fetch, chave: env.TOKEN_ENCRYPTION_KEY, agora: deps.agora()
    });
    return responder(res, 200, { ok: true, concorrente: novo });
  } catch (e) {
    if (e instanceof ErroHttp) return responder(res, e.status, { error: e.message });
    if (e instanceof conc.ErroConcorrente) return responder(res, e.status, { error: e.message });
    console.error('concorrentes-adicionar:', e.message);
    return responder(res, 500, { error: 'Erro ao cadastrar o concorrente' });
  }
}

async function concorrentesRemover(req, res, deps) {
  if (req.method !== 'POST') return responder(res, 405, { error: 'Método não permitido' });
  try {
    let corpo = {};
    try { corpo = JSON.parse((await lerCorpo(req)) || '{}'); } catch (e) { return responder(res, 400, { error: 'corpo inválido' }); }
    const acesso = await exigirPapel(req, corpo.orgId, 'editor', deps);
    if (!UUID_CONC.test(String(corpo.id || ''))) return responder(res, 400, { error: 'concorrente inválido' });
    // Os resumos e o histórico somem junto (cascade no banco).
    await meta.rest(deps.config, deps.fetch, 'DELETE',
      `competitor_accounts?id=eq.${encodeURIComponent(corpo.id)}&organization_id=eq.${encodeURIComponent(acesso.organizationId)}`,
      undefined, { Prefer: 'return=minimal' });
    return responder(res, 200, { ok: true });
  } catch (e) {
    if (e instanceof ErroHttp) return responder(res, e.status, { error: e.message });
    console.error('concorrentes-remover:', e.message);
    return responder(res, 500, { error: 'Erro ao remover o concorrente' });
  }
}

async function concorrentesSincronizar(req, res, deps) {
  if (req.method !== 'POST') return responder(res, 405, { error: 'Método não permitido' });
  try {
    let corpo = {};
    try { corpo = JSON.parse((await lerCorpo(req)) || '{}'); } catch (e) { return responder(res, 400, { error: 'corpo inválido' }); }
    const acesso = await exigirPapel(req, corpo.orgId, 'editor', deps);
    const env = deps.env;
    if (!env.TOKEN_ENCRYPTION_KEY) return responder(res, 500, { error: 'Configure no Vercel: TOKEN_ENCRYPTION_KEY' });
    const r = await conc.sincronizarConcorrentes({
      orgId: acesso.organizationId, cfg: deps.config, f: deps.fetch, chave: env.TOKEN_ENCRYPTION_KEY, agora: deps.agora()
    });
    return responder(res, 200, { ok: r.ok, erro: r.erro || null, resultados: r.resultados });
  } catch (e) {
    if (e instanceof ErroHttp) return responder(res, e.status, { error: e.message });
    console.error('concorrentes-sincronizar:', e.message);
    return responder(res, 500, { error: 'Erro ao atualizar os concorrentes' });
  }
}

// ── Inteligência artificial: análise do período (dados reais, sem estimativas) ──
// Gerar: editor+ (chama a OpenAI, que cobra). Ler o histórico: qualquer membro.
const ia = require('./analise-ia');

async function iaAnalisar(req, res, deps) {
  if (req.method !== 'POST') return responder(res, 405, { error: 'Método não permitido' });
  try {
    let corpo = {};
    try { corpo = JSON.parse((await lerCorpo(req)) || '{}'); } catch (e) { return responder(res, 400, { error: 'corpo inválido' }); }
    const acesso = await exigirPapel(req, corpo.orgId, 'editor', deps);
    const env = deps.env;
    if (!env.OPENAI_API_KEY) return responder(res, 500, { error: 'Configure no Vercel: OPENAI_API_KEY' });
    try {
      metricas.validarPeriodo(String(corpo.ini || ''), String(corpo.fim || ''));
    } catch (e) {
      return responder(res, 400, { error: e.message });
    }
    const conta = corpo.conta || null;
    if (conta && !UUID_CONC.test(String(conta))) return responder(res, 400, { error: 'conta inválida' });
    const r = await ia.analisarPeriodo({
      orgId: acesso.organizationId, userId: acesso.user.id, contaId: conta, ini: corpo.ini, fim: corpo.fim,
      cfg: deps.config, f: deps.fetch, env, agora: deps.agora()
    });
    return responder(res, 200, { ok: true, ...r });
  } catch (e) {
    if (e instanceof ErroHttp) return responder(res, e.status, { error: e.message });
    if (e instanceof ia.ErroIA) return responder(res, e.status, { error: e.message });
    console.error('ia-analisar:', e.message);
    return responder(res, 500, { error: 'Erro ao gerar a análise' });
  }
}

async function iaHistorico(req, res, deps) {
  if (req.method !== 'GET') return responder(res, 405, { error: 'Método não permitido' });
  try {
    const acesso = await exigirPapel(req, (req.query || {}).org, 'viewer', deps);
    const analises = await ia.listarAnalises({ orgId: acesso.organizationId, cfg: deps.config, f: deps.fetch });
    return responder(res, 200, { ok: true, papel: acesso.role, analises });
  } catch (e) {
    if (e instanceof ErroHttp) return responder(res, e.status, { error: e.message });
    console.error('ia-historico:', e.message);
    return responder(res, 500, { error: 'Erro ao ler o histórico de análises' });
  }
}

// ── Relatórios (semanal, mensal ou personalizado): só leitura dos dados sincronizados ──
const relatorios = require('./relatorio');

async function relatorioOrganizacao(req, res, deps) {
  if (req.method !== 'GET') return responder(res, 405, { error: 'Método não permitido' });
  try {
    const q = req.query || {};
    const acesso = await exigirPapel(req, q.org, 'viewer', deps);
    const conta = q.conta || null;
    if (conta && !UUID_CONC.test(String(conta))) return responder(res, 400, { error: 'conta inválida' });
    const r = await relatorios.gerarRelatorio({
      orgId: acesso.organizationId, tipo: q.tipo, ini: q.ini, fim: q.fim, contaId: conta,
      agora: deps.agora(), cfg: deps.config, f: deps.fetch
    });
    return responder(res, 200, { ok: true, relatorio: r, csv: relatorios.csvDoRelatorio(r) });
  } catch (e) {
    if (e instanceof ErroHttp) return responder(res, e.status, { error: e.message });
    if (e instanceof relatorios.ErroRelatorio) return responder(res, e.status, { error: e.message });
    console.error('relatorio:', e.message);
    return responder(res, 500, { error: 'Erro ao montar o relatório' });
  }
}

// ── Empresa de cada conta (Academia, Sorveteria, GympulsePro): owner ou admin ───
const empresas = require('./empresas');

async function contasEmpresa(req, res, deps) {
  if (req.method !== 'POST') return responder(res, 405, { error: 'Método não permitido' });
  try {
    let corpo = {};
    try { corpo = JSON.parse((await lerCorpo(req)) || '{}'); } catch (e) { return responder(res, 400, { error: 'corpo inválido' }); }
    const acesso = await exigirPapel(req, corpo.orgId, 'admin', deps);
    const empresa = corpo.empresa === undefined || corpo.empresa === '' ? null : corpo.empresa;
    const r = await empresas.definirEmpresa({
      orgId: acesso.organizationId, contaId: corpo.contaId, empresa, cfg: deps.config, f: deps.fetch
    });
    return responder(res, 200, { ok: true, conta: r });
  } catch (e) {
    if (e instanceof ErroHttp) return responder(res, e.status, { error: e.message });
    if (e instanceof empresas.ErroEmpresa) return responder(res, e.status, { error: e.message });
    console.error('contas-empresa:', e.message);
    return responder(res, 500, { error: 'Erro ao salvar a empresa da conta' });
  }
}

// ── Configurações: situação das contas, sincronização e envio por e-mail ───────
const configuracoes = require('./configuracoes');

async function configuracoesOrganizacao(req, res, deps) {
  if (req.method !== 'GET') return responder(res, 405, { error: 'Método não permitido' });
  try {
    const acesso = await exigirPapel(req, (req.query || {}).org, 'viewer', deps);
    const dados = await configuracoes.lerConfiguracoes({
      orgId: acesso.organizationId, papel: acesso.role, cfg: deps.config, f: deps.fetch, agora: deps.agora()
    });
    return responder(res, 200, { ok: true, ...dados });
  } catch (e) {
    if (e instanceof ErroHttp) return responder(res, e.status, { error: e.message });
    console.error('configuracoes:', e.message);
    return responder(res, 500, { error: 'Erro ao ler as configurações' });
  }
}

const HANDLERS = {
  'contas-empresa': contasEmpresa,
  'configuracoes': configuracoesOrganizacao,
  'relatorio': relatorioOrganizacao,
  'ia-analisar': iaAnalisar,
  'ia-historico': iaHistorico,
  'concorrentes': concorrentesOrganizacao,
  'concorrentes-adicionar': concorrentesAdicionar,
  'concorrentes-remover': concorrentesRemover,
  'concorrentes-sincronizar': concorrentesSincronizar,
  'meta-iniciar': iniciarMeta,
  'meta-callback': callbackMeta,
  'ig-iniciar': iniciarInstagram,
  'ig-callback': callbackInstagram,
  'sincronizar': sincronizarOrganizacao,
  'desautorizacao': callbackDesautorizacao,
  'exclusao-dados': callbackExclusaoDados,
  'importar-portfolio': importarPortfolio,
  'metricas': metricasOrganizacao,
  'publicacoes': publicacoesOrganizacao,
  'sincronizar-cron': sincronizarTodasCron,
  'contas': contasOrganizacao
};

function dependenciasPadrao(env = process.env) {
  return {
    env,
    config: configSupabase(env),
    fetch: (...args) => fetch(...args),
    agora: () => Date.now()
  };
}

module.exports = { HANDLERS, iniciarMeta, callbackMeta, iniciarInstagram, callbackInstagram, sincronizarOrganizacao, contasOrganizacao, dependenciasPadrao };
