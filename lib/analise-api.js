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
      url: meta.urlDeLogin({ appId: env.META_APP_ID, redirectUri: env.META_REDIRECT_URI, estado })
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

const HANDLERS = {
  'meta-iniciar': iniciarMeta,
  'meta-callback': callbackMeta,
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

module.exports = { HANDLERS, iniciarMeta, callbackMeta, contasOrganizacao, dependenciasPadrao };
