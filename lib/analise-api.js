// Handlers da Análise das Redes Sociais (chamados por api/analise.js).
//   POST meta-iniciar  -> admin+ da organização recebe a URL de login da Meta.
//   GET  meta-callback -> retorno da Meta: confere o estado, troca o código e grava as contas.
//   GET  contas        -> viewer+ lista as contas conectadas (sem tokens).

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
        erro: r.erro || null, tokenRenovado: !!r.tokenRenovado
      });
    }
    return responder(res, 200, { ok: true, resultados });
  } catch (e) {
    if (e instanceof ErroHttp) return responder(res, e.status, { error: e.message });
    return responder(res, 500, { error: 'Erro ao sincronizar' });
  }
}

const HANDLERS = {
  'meta-iniciar': iniciarMeta,
  'meta-callback': callbackMeta,
  'ig-iniciar': iniciarInstagram,
  'ig-callback': callbackInstagram,
  'sincronizar': sincronizarOrganizacao,
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
