// Testa a empresa de cada conta: gravação, limpeza, validações, conta de outra organização,
// a lista de contas que devolve a empresa e as permissões da rota. Sem rede: o Supabase é simulado.
const assert = require('assert');
const empresas = require('../lib/empresas');
const meta = require('../lib/meta-oauth');
const analise = require('../lib/analise-api');

const CFG = { url: 'https://projeto.supabase.test', anon: 'a', service: 's' };
const ORG = '22222222-2222-2222-2222-222222222222';
const USUARIO = '11111111-1111-1111-1111-111111111111';
const CONTA = '33333333-3333-3333-3333-333333333333';
const CONTA_DE_OUTRA_ORG = 'ffffffff-ffff-4fff-8fff-ffffffffffff';

const resposta = (status, corpo) => {
  const texto = corpo === undefined ? '' : JSON.stringify(corpo);
  return { ok: status >= 200 && status < 300, status, text: async () => texto, json: async () => JSON.parse(texto || '[]') };
};

function criarFake({ papel = 'admin', contasDaOrg = [CONTA] } = {}) {
  const log = [];
  const f = async (url, init = {}) => {
    const u = new URL(url);
    const metodo = (init.method || 'GET').toUpperCase();
    const corpo = init.body ? JSON.parse(init.body) : undefined;
    log.push({ metodo, u, corpo });
    if (u.pathname === '/auth/v1/user') return resposta(200, { id: USUARIO });
    if (u.pathname === '/rest/v1/organization_members') return resposta(200, papel ? [{ role: papel }] : []);
    if (u.pathname === '/rest/v1/social_accounts' && metodo === 'GET') {
      const id = (u.searchParams.get('id') || '').replace(/^eq\./, '');
      return resposta(200, contasDaOrg.includes(id) ? [{ id }] : []);
    }
    if (u.pathname === '/rest/v1/social_accounts' && metodo === 'PATCH') return resposta(204, undefined);
    return resposta(404, {});
  };
  return { f, log };
}

(async () => {
  assert.deepStrictEqual(empresas.EMPRESAS, ['academia', 'sorveteria', 'gympulse']);

  // ── Gravação ───────────────────────────────────────────────────────────────────
  const ok = criarFake();
  const r = await empresas.definirEmpresa({ orgId: ORG, contaId: CONTA, empresa: 'academia', cfg: CFG, f: ok.f });
  assert.deepStrictEqual(r, { id: CONTA, empresa: 'academia' });
  const gravou = ok.log.find((x) => x.metodo === 'PATCH');
  assert.deepStrictEqual(gravou.corpo, { empresa: 'academia' });
  assert.strictEqual(gravou.u.searchParams.get('id'), 'eq.' + CONTA, 'grava só a conta escolhida');
  assert.strictEqual(gravou.u.searchParams.get('organization_id'), 'eq.' + ORG, 'e só dentro da organização');

  // Tirar a conta da empresa
  const limpa = criarFake();
  await empresas.definirEmpresa({ orgId: ORG, contaId: CONTA, empresa: null, cfg: CFG, f: limpa.f });
  assert.deepStrictEqual(limpa.log.find((x) => x.metodo === 'PATCH').corpo, { empresa: null });

  // ── Validações ─────────────────────────────────────────────────────────────────
  await assert.rejects(empresas.definirEmpresa({ orgId: ORG, contaId: CONTA, empresa: 'nike', cfg: CFG, f: criarFake().f }),
    (e) => e instanceof empresas.ErroEmpresa && e.status === 400 && /desconhecida/.test(e.message));
  await assert.rejects(empresas.definirEmpresa({ orgId: ORG, contaId: 'nao-e-uuid', empresa: 'academia', cfg: CFG, f: criarFake().f }),
    (e) => e instanceof empresas.ErroEmpresa && /inválida/.test(e.message));
  await assert.rejects(empresas.definirEmpresa({ orgId: ORG, contaId: CONTA_DE_OUTRA_ORG, empresa: 'academia', cfg: CFG, f: criarFake().f }),
    (e) => e instanceof empresas.ErroEmpresa && e.status === 404, 'conta de outra organização não é encontrada');

  // ── Lista de contas traz a empresa (para o resumo e as páginas) ───────────────
  const listaFake = [];
  await meta.listarContasDaOrganizacao({ orgId: ORG, cfg: CFG, f: async (url) => { listaFake.push(url); return resposta(200, []); } });
  assert.ok(listaFake[0].includes('empresa'), 'a lista de contas pede o campo empresa');

  // ── Handler: só owner e admin; editor e viewer não mudam ──────────────────────
  const deps = (f) => ({ env: {}, config: CFG, fetch: f, agora: () => Date.parse('2026-11-21T15:00:00Z') });
  const chamar = async (f, corpo, metodo = 'POST') => {
    const cbs = {};
    const req = { method: metodo, query: {}, headers: { authorization: 'Bearer t' }, on(ev, cb) { cbs[ev] = cb; return req; } };
    const res = { statusCode: 200, body: undefined, status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; return this; } };
    const p = analise.HANDLERS['contas-empresa'](req, res, deps(f));
    if (cbs.data) cbs.data(corpo === undefined ? '' : JSON.stringify(corpo));
    if (cbs.end) cbs.end();
    await p;
    return res;
  };

  let h = await chamar(criarFake({ papel: 'admin' }).f, { orgId: ORG, contaId: CONTA, empresa: 'sorveteria' });
  assert.strictEqual(h.statusCode, 200);
  assert.strictEqual(h.body.conta.empresa, 'sorveteria');

  h = await chamar(criarFake({ papel: 'owner' }).f, { orgId: ORG, contaId: CONTA, empresa: 'gympulse' });
  assert.strictEqual(h.statusCode, 200, 'owner também muda');

  h = await chamar(criarFake({ papel: 'editor' }).f, { orgId: ORG, contaId: CONTA, empresa: 'academia' });
  assert.strictEqual(h.statusCode, 403, 'editor não muda a empresa da conta');

  h = await chamar(criarFake({ papel: 'admin' }).f, { orgId: ORG, contaId: CONTA, empresa: 'nike' });
  assert.strictEqual(h.statusCode, 400);

  h = await chamar(criarFake({ papel: 'admin' }).f, { orgId: ORG, contaId: CONTA, empresa: '' });
  assert.strictEqual(h.statusCode, 200, 'string vazia tira a conta da empresa');

  h = await chamar(criarFake({ papel: null }).f, { orgId: ORG, contaId: CONTA, empresa: 'academia' });
  assert.strictEqual(h.statusCode, 403, 'quem não é membro não muda');

  console.log('ok (empresas)');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
