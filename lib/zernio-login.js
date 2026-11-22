'use strict';
// Login do painel para as rotas da Zernio (publicar, cancelar, republicar, consultar, enviar mídia).
// Ativado pela variável EXIGIR_LOGIN_ZERNIO=1 no Vercel. Sem ela, nada muda.
// Com ela, a rota só responde quando a requisição traz o token de uma sessão Supabase válida.
// Os agendamentos automáticos (cron e programação do servidor) não passam por aqui.

const { usuarioDoRequest } = require('./supabase-server');

function exigeLoginAtivo(env = process.env) {
  return env.EXIGIR_LOGIN_ZERNIO === '1';
}

// Devolve true se a requisição pode seguir. Senão responde 401 e devolve false.
// Falha de verificação conta como "sem login" (fecha por padrão).
async function exigirLogin(req, res, deps = {}) {
  if (!exigeLoginAtivo(deps.env || process.env)) return true;
  let usuario = null;
  try {
    usuario = await usuarioDoRequest(req, deps);
  } catch (e) {
    usuario = null;
  }
  if (usuario) return true;
  res.status(401).json({ error: 'Entre no painel para publicar.' });
  return false;
}

module.exports = { exigirLogin, exigeLoginAtivo };
