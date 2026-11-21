// Testa Configurações: origem e situação das contas, validade dos tokens, quem vê o resultado
// detalhado da sincronização e as permissões da rota. Sem rede: o Supabase é simulado.
const assert = require('assert');
const configuracoes = require('../lib/configuracoes');
const analise = require('../lib/analise-api');

const CFG = { url: 'https://projeto.supabase.test', anon: 'a', service: 's' };
const ORG = '22222222-2222-2222-2222-222222222222';
const USUARIO = '11111111-1111-1111-1111-111111111111';
const A = '33333333-3333-3333-3333-333333333333';
const B = '44444444-4444-4444-4444-444444444444';
const C = '55555555-5555-4555-8555-555555555555';
const AGORA = Date.parse('2026-11-21T15:00:00Z');

const resposta = (status, corpo) => {
  const texto = corpo === undefined ? '' : JSON.stringify(corpo);
  return { ok: status >= 200 && status < 300, status, text: async () => texto, json: async () => JSON.parse(texto || '[]') };
};

const CONTAS = [
  { id: A, platform: 'instagram', external_id: '1784140', parent_external_id: 'portfolio', username: 'academia', status: 'active', last_synced_at: '2026-11-21T11:00:00Z' },
  { id: B, platform: 'instagram', external_id: '1784141', parent_external_id: null, username: 'sorveteria', status: 'expired', last_synced_at: '2026-11-18T11:00:00Z' },
  { id: C, platform: 'facebook', external_id: '999', parent_external_id: '1234', username: 'pagina-antiga', status: 'active', last_synced_at: null }
];
const TOKENS = [
  { social_account_id: A, token_expires_at: null },
  { social_account_id: B, token_expires_at: '2026-11-25T15:00:00Z' }, // 4 dias
  { social_account_id: C, token_expires_at: '2026-11-20T00:00:00Z' }  // já venceu
];
const LOGS = [
  { social_account_id: A, origin: 'cron', status: 'ok', started_at: '2026-11-21T11:00:00Z', records_written: 49, error_message: null },
  { social_account_id: B, origin: 'manual', status: 'error', started_at: '2026-11-20T10:00:00Z', records_written: 0, error_message: 'Permissão insuficiente' }
];

function criarFake({ papel = 'admin', contas = CONTAS, tokens = TOKENS, logs = LOGS } = {}) {
  return async (url) => {
    const u = new URL(url);
    if (u.pathname === '/auth/v1/user') return resposta(200, { id: USUARIO });
    if (u.pathname === '/rest/v1/organization_members') return resposta(200, papel ? [{ role: papel }] : []);
    if (u.pathname === '/rest/v1/social_accounts') return resposta(200, contas);
    if (u.pathname === '/rest/v1/social_tokens') return resposta(200, tokens);
    if (u.pathname === '/rest/v1/synchronization_logs') return resposta(200, logs);
    return resposta(404, {});
  };
}

(async () => {
  // ── Origem, situação e validade ────────────────────────────────────────────────
  assert.strictEqual(configuracoes.origemDaConta(CONTAS[0]), 'Login unificado (portfólio)');
  assert.strictEqual(configuracoes.origemDaConta(CONTAS[1]), 'Instagram (login direto)');
  assert.strictEqual(configuracoes.origemDaConta(CONTAS[2]), 'Página do Facebook');

  assert.deepStrictEqual(configuracoes.tokenDaConta(null, AGORA), { rotulo: 'não expira', expirado: false, expiraEm: null });
  assert.strictEqual(configuracoes.tokenDaConta('2026-11-25T15:00:00Z', AGORA).rotulo, 'expira em 4 dias');
  assert.strictEqual(configuracoes.tokenDaConta('2026-11-22T20:00:00Z', AGORA).rotulo, 'expira em 2 dias', 'arredonda para cima');
  assert.strictEqual(configuracoes.tokenDaConta('2026-11-22T10:00:00Z', AGORA).rotulo, 'expira em 1 dia');
  assert.strictEqual(configuracoes.tokenDaConta('2026-11-20T00:00:00Z', AGORA).expirado, true);

  // ── Admin: vê o resultado detalhado e a última automática ──────────────────────
  const admin = await configuracoes.lerConfiguracoes({ orgId: ORG, papel: 'admin', cfg: CFG, f: criarFake(), agora: AGORA });
  assert.strictEqual(admin.podeSincronizar, true);
  const [ca, cb, cc] = admin.contas;
  assert.strictEqual(ca.origem, 'Login unificado (portfólio)');
  assert.strictEqual(ca.token.rotulo, 'não expira');
  assert.strictEqual(ca.ultimoResultado.status, 'ok');
  assert.strictEqual(ca.ultimoResultado.registros, 49);
  assert.strictEqual(cb.situacaoRotulo, 'Expirada: conecte de novo');
  assert.strictEqual(cb.token.rotulo, 'expira em 4 dias');
  assert.strictEqual(cb.ultimoResultado.erro, 'Permissão insuficiente', 'o erro aparece para admin');
  assert.strictEqual(cc.token.expirado, true);
  assert.strictEqual(cc.ultimaSincronizacao, null, 'conta nunca sincronizada: null, não uma data inventada');
  assert.strictEqual(cc.ultimoResultado, null);
  assert.strictEqual(admin.automatica.ultimaEm, '2026-11-21T11:00:00Z');
  assert.strictEqual(admin.automatica.ultimoStatus, 'ok');
  assert.strictEqual(admin.envioEmail.disponivel, false, 'envio por e-mail ainda não está ligado');

  // ── Viewer: vê a situação, mas não o resultado detalhado nem a automática ──────
  const viewer = await configuracoes.lerConfiguracoes({ orgId: ORG, papel: 'viewer', cfg: CFG, f: criarFake({ papel: 'viewer' }), agora: AGORA });
  assert.strictEqual(viewer.podeSincronizar, false);
  assert.strictEqual(viewer.contas[0].ultimoResultado, null, 'viewer não vê erros de sincronização');
  assert.strictEqual(viewer.automatica.ultimaEm, null);
  assert.strictEqual(viewer.contas[1].situacaoRotulo, 'Expirada: conecte de novo', 'a situação é visível para todos');

  // ── Sem contas: sem chamada de tokens ──────────────────────────────────────────
  const semContas = criarFake({ contas: [], tokens: [], logs: [] });
  const vazio = await configuracoes.lerConfiguracoes({ orgId: ORG, papel: 'admin', cfg: CFG, f: semContas, agora: AGORA });
  assert.deepStrictEqual(vazio.contas, []);

  // ── Handler: permissões ────────────────────────────────────────────────────────
  const deps = (f) => ({ env: {}, config: CFG, fetch: f, agora: () => AGORA });
  const chamar = async (f, query) => {
    const res = { statusCode: 200, body: undefined, status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; return this; } };
    const req = { method: 'GET', query, headers: { authorization: 'Bearer t' }, on() { return req; } };
    await analise.HANDLERS['configuracoes'](req, res, deps(f));
    return res;
  };

  let h = await chamar(criarFake({ papel: 'viewer' }), { org: ORG });
  assert.strictEqual(h.statusCode, 200, 'viewer lê a configuração');
  assert.strictEqual(h.body.podeSincronizar, false);

  h = await chamar(criarFake({ papel: null }), { org: ORG });
  assert.strictEqual(h.statusCode, 403, 'quem não é membro não lê');

  h = await chamar(criarFake({ papel: 'admin' }), { org: ORG });
  assert.strictEqual(h.statusCode, 200);
  assert.strictEqual(h.body.contas.length, 3);

  console.log('ok (configuracoes)');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
