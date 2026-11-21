// Configurações da análise: situação das contas, validade dos tokens, sincronização (última e automática)
// e o estado do envio de relatórios por e-mail.
// Resultado detalhado de sincronização (erros, registros) só para owner e admin, igual à RLS do log.
// Nenhum token sai daqui: só a data de validade.

const { rest } = require('./meta-oauth');

const DIA = 24 * 3600 * 1000;
const PAPEIS_LOGS = ['admin', 'owner'];
const SITUACAO = { active: 'Ativa', expired: 'Expirada: conecte de novo', revoked: 'Revogada', error: 'Com erro' };

// Origem pela marcação da conta: portfólio, Página do Facebook ou login direto do Instagram.
function origemDaConta(c) {
  if (c.parent_external_id === 'portfolio') return 'Login unificado (portfólio)';
  if (c.parent_external_id) return 'Página do Facebook';
  return 'Instagram (login direto)';
}

function tokenDaConta(expiraEm, agora) {
  if (!expiraEm) return { rotulo: 'não expira', expirado: false, expiraEm: null };
  const ms = Date.parse(expiraEm) - agora;
  if (ms <= 0) return { rotulo: 'expirado: conecte de novo', expirado: true, expiraEm };
  const dias = Math.ceil(ms / DIA);
  return { rotulo: `expira em ${dias} ${dias === 1 ? 'dia' : 'dias'}`, expirado: false, expiraEm };
}

async function lerConfiguracoes({ orgId, papel, cfg, f, agora }) {
  const org = encodeURIComponent(orgId);
  const contas = await rest(cfg, f, 'GET',
    `social_accounts?select=id,platform,external_id,parent_external_id,username,status,last_synced_at` +
    `&organization_id=eq.${org}&order=username.asc`) || [];
  const ids = contas.map((c) => c.id);
  const tokens = ids.length
    ? await rest(cfg, f, 'GET', `social_tokens?select=social_account_id,token_expires_at&social_account_id=in.(${ids.join(',')})`) || []
    : [];
  const expiraPorConta = Object.fromEntries(tokens.map((t) => [t.social_account_id, t.token_expires_at]));

  const podeVerLogs = PAPEIS_LOGS.includes(papel);
  const logs = podeVerLogs
    ? await rest(cfg, f, 'GET',
      `synchronization_logs?select=social_account_id,origin,status,started_at,records_written,error_message` +
      `&organization_id=eq.${org}&order=started_at.desc&limit=100`) || []
    : [];
  const ultimoLogPorConta = {};
  for (const l of logs) {
    if (l.social_account_id && ultimoLogPorConta[l.social_account_id] === undefined) ultimoLogPorConta[l.social_account_id] = l;
  }
  const ultimaAutomatica = logs.find((l) => l.origin === 'cron') || null;

  return {
    papel,
    podeSincronizar: podeVerLogs,
    contas: contas.map((c) => {
      const log = ultimoLogPorConta[c.id];
      return {
        id: c.id,
        username: c.username || c.external_id,
        plataforma: c.platform,
        origem: origemDaConta(c),
        situacao: c.status,
        situacaoRotulo: SITUACAO[c.status] || c.status,
        ultimaSincronizacao: c.last_synced_at || null,
        token: tokenDaConta(expiraPorConta[c.id], agora),
        ultimoResultado: podeVerLogs && log
          ? { status: log.status, origem: log.origin, em: log.started_at, registros: log.records_written, erro: log.error_message || null }
          : null
      };
    }),
    automatica: {
      horario: '08:00 (Brasília), todos os dias',
      ultimaEm: podeVerLogs && ultimaAutomatica ? ultimaAutomatica.started_at : null,
      ultimoStatus: podeVerLogs && ultimaAutomatica ? ultimaAutomatica.status : null
    },
    // Ainda sem serviço de e-mail configurado no projeto (ver a mensagem na tela).
    envioEmail: { disponivel: false }
  };
}

module.exports = { lerConfiguracoes, origemDaConta, tokenDaConta, SITUACAO };
