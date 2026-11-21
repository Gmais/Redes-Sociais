// Testa Concorrentes (Business Discovery): normalização do @, resumo das publicações, erros da Meta,
// cadastro que só grava depois do perfil lido, listagem com histórico, papéis e sincronização. Sem rede.
const assert = require('assert');
const crypto = require('crypto');
const conc = require('../lib/concorrentes');
const analise = require('../lib/analise-api');
const { cifrarToken } = require('../lib/token-vault');

const CHAVE = crypto.randomBytes(32).toString('base64');
const CFG = { url: 'https://projeto.supabase.test', anon: 'a', service: 's' };
const ORG = '22222222-2222-2222-2222-222222222222';
const USUARIO = '11111111-1111-1111-1111-111111111111';
const CONTA = '6f1c2a10-0000-4000-8000-0000000000aa';
const C1 = '7c1d0c00-0000-4000-8000-000000000001';
const C2 = '7c1d0c00-0000-4000-8000-000000000002';
const AGORA = Date.parse('2026-11-21T15:00:00Z'); // 12:00 em Brasília
const DIA = 86400000;
const ha = (dias) => new Date(AGORA - dias * DIA).toISOString();
const CONTA_ATIVA = { id: CONTA, external_id: '17841400000000001', username: 'academia', platform: 'instagram', status: 'active' };

// Publicações como a Meta devolve em business_discovery (media_type, sem media_product_type).
const MIDIAS = [
  { media_type: 'IMAGE', timestamp: ha(2), like_count: 10, comments_count: 2 },
  { media_type: 'VIDEO', timestamp: ha(10), like_count: 30, comments_count: 0 },
  { media_type: 'CAROUSEL_ALBUM', timestamp: ha(40) }, // curtidas ocultas e fora da janela
  { media_type: 'IMAGE', timestamp: ha(1), comments_count: 4 }
];

const resposta = (status, corpo) => {
  const texto = corpo === undefined ? '' : JSON.stringify(corpo);
  return { ok: status >= 200 && status < 300, status, text: async () => texto, json: async () => JSON.parse(texto || '[]') };
};

// Respostas da Meta por handle consultado.
function grafo(handle) {
  if (handle === 'concorrente.x') {
    return { status: 200, body: { business_discovery: { username: 'concorrente.x', followers_count: 1200, media_count: 210, media: { data: MIDIAS } } } };
  }
  if (handle === 'token') return { status: 400, body: { error: { code: 190, message: 'Invalid OAuth access token' } } };
  if (handle === 'limite') return { status: 400, body: { error: { code: 4, message: 'Application request limit reached' } } };
  return { status: 400, body: { error: { code: 100, message: 'Unsupported get request. Object does not exist' } } };
}

function criarFake({ papel = 'editor', contas = [CONTA_ATIVA], concorrentes = [], snapshots = [], graph = grafo, contasCron = [] } = {}) {
  const log = [];
  const estado = { concorrentes: concorrentes.map((c) => ({ ...c })), snapshots: [...snapshots], proximoId: 1 };
  const f = async (url, init = {}) => {
    const u = new URL(url);
    const metodo = (init.method || 'GET').toUpperCase();
    const corpo = init.body ? JSON.parse(init.body) : undefined;
    log.push({ metodo, u, corpo, prefer: (init.headers || {}).Prefer });
    if (u.hostname === 'graph.facebook.com') {
      const m = (u.searchParams.get('fields') || '').match(/business_discovery\.username\(([^)]+)\)/);
      const r = graph(m ? m[1] : null);
      return resposta(r.status, r.body);
    }
    const off = Number(u.searchParams.get('offset') || 0);
    if (u.pathname === '/auth/v1/user') return resposta(200, { id: USUARIO });
    if (u.pathname === '/rest/v1/organization_members') return resposta(200, papel ? [{ role: papel }] : []);
    if (u.pathname === '/rest/v1/social_accounts') {
      // A consulta de concorrentes pede uma conta (limit=1); a rotina diária de contas pede todas (contasCron).
      return resposta(200, u.searchParams.get('limit') === '1' ? contas : contasCron);
    }
    if (u.pathname === '/rest/v1/social_tokens') {
      return resposta(200, [{ access_token_encrypted: cifrarToken('tok-conta', CONTA, CHAVE), token_expires_at: null, scopes: [] }]);
    }
    if (u.pathname === '/rest/v1/competitor_accounts') {
      if (metodo === 'POST') {
        const linha = { id: 'cid-' + estado.proximoId++, handle: corpo.handle, display_name: corpo.display_name ?? null, organization_id: corpo.organization_id };
        estado.concorrentes.push(linha);
        return resposta(201, [linha]);
      }
      if (metodo === 'DELETE') {
        const id = u.searchParams.get('id').replace(/^eq\./, '');
        estado.concorrentes = estado.concorrentes.filter((c) => c.id !== id);
        return resposta(204, undefined);
      }
      if (u.searchParams.get('select') === 'organization_id') {
        return resposta(200, estado.concorrentes.map(() => ({ organization_id: ORG })));
      }
      const h = u.searchParams.get('handle');
      return resposta(200, estado.concorrentes.filter((c) => !h || c.handle === h.replace(/^eq\./, '')));
    }
    if (u.pathname === '/rest/v1/competitor_snapshots') {
      if (metodo === 'POST') {
        estado.snapshots.unshift(corpo);
        return resposta(201, undefined);
      }
      return resposta(200, estado.snapshots.slice(off, off + 1000));
    }
    return resposta(404, {});
  };
  return { f, estado, log };
}

const deps = (f, env = {}) => ({ env: { TOKEN_ENCRYPTION_KEY: CHAVE, ...env }, config: CFG, fetch: f, agora: () => AGORA });

// Chama um handle como a rota faria: GET sem corpo; POST entrega o corpo pelos eventos de requisição.
async function chamar(rota, f, { query = {}, corpo, metodo = 'POST', cabecalhos = {}, env = {} } = {}) {
  const cbs = {};
  const req = { method: metodo, query, headers: { authorization: 'Bearer t', ...cabecalhos }, on(ev, cb) { cbs[ev] = cb; return req; } };
  const res = { statusCode: 200, body: undefined, status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; return this; } };
  const p = analise.HANDLERS[rota](req, res, deps(f, env));
  if (metodo !== 'GET') {
    if (cbs.data) cbs.data(corpo === undefined ? '' : JSON.stringify(corpo));
    if (cbs.end) cbs.end();
  }
  await p;
  return res;
}

(async () => {
  // ── Handle: aceita "@", rejeita o que não é handle do Instagram ─────────────────
  assert.strictEqual(conc.normalizarHandle('@Academia.Planeta_1'), 'Academia.Planeta_1');
  assert.strictEqual(conc.normalizarHandle('  sorvetes.guri  '), 'sorvetes.guri');
  assert.strictEqual(conc.normalizarHandle('a'.repeat(30)), 'a'.repeat(30));
  assert.strictEqual(conc.normalizarHandle('a'.repeat(31)), null, 'máximo de 30 caracteres');
  assert.strictEqual(conc.normalizarHandle('com espaço'), null);
  assert.strictEqual(conc.normalizarHandle('https://instagram.com/x'), null, 'não aceita link');
  assert.strictEqual(conc.normalizarHandle(''), null);

  // ── Resumo das publicações ─────────────────────────────────────────────────────
  const r = conc.resumirPublicacoes(MIDIAS, AGORA);
  assert.strictEqual(r.amostra, 4);
  assert.strictEqual(r.publicacoes30d, 3, 'a publicação de 40 dias fica fora da janela de 30');
  assert.strictEqual(r.engajamentoMedio, 15.3, '(12 + 30 + 4) / 3; a publicação com curtidas ocultas não entra');
  assert.deepStrictEqual(r.tipos, { post: 2, reel: 0, story: 0, carousel: 1, video: 1, other: 0 });
  assert.strictEqual(r.ultimaPublicacaoEm, ha(1));
  const vazio = conc.resumirPublicacoes([], AGORA);
  assert.deepStrictEqual([vazio.amostra, vazio.publicacoes30d, vazio.engajamentoMedio, vazio.ultimaPublicacaoEm], [0, 0, null, null]);

  // ── Consulta: campos pedidos e token na URL ────────────────────────────────────
  const fake = criarFake();
  const perfil = await conc.buscarPerfil({ igUserId: CONTA_ATIVA.external_id, token: 'tok', handle: 'concorrente.x', f: fake.f });
  assert.strictEqual(perfil.followers_count, 1200);
  const pedido = fake.log[0];
  assert.strictEqual(pedido.u.host, 'graph.facebook.com');
  assert.strictEqual(pedido.u.pathname, '/v27.0/' + CONTA_ATIVA.external_id);
  assert.strictEqual(pedido.u.searchParams.get('access_token'), 'tok');
  const campos = pedido.u.searchParams.get('fields');
  assert.ok(campos.startsWith('business_discovery.username(concorrente.x){followers_count,media_count,media{'), 'pede o perfil pelo handle');
  assert.ok(!/media_product_type|limit/.test(campos), 'não pede campos que não estão confirmados na documentação');

  // ── Erros da Meta viram mensagens para a tela, com status certo ───────────────
  await assert.rejects(conc.buscarPerfil({ igUserId: '1', token: 't', handle: 'token', f: criarFake().f }),
    (e) => e instanceof conc.ErroConcorrente && e.status === 400 && /expirou/.test(e.message));
  await assert.rejects(conc.buscarPerfil({ igUserId: '1', token: 't', handle: 'limite', f: criarFake().f }),
    (e) => e.status === 429 && /Tente de novo/.test(e.message));
  await assert.rejects(conc.buscarPerfil({ igUserId: '1', token: 't', handle: 'pessoal', f: criarFake().f }),
    (e) => e.status === 422 && /@pessoal/.test(e.message) && /profissional/.test(e.message) && !/Unsupported/.test(e.message),
    'o detalhe técnico da Meta não vai para a tela');

  // ── Cadastro: só grava depois que a Meta devolve o perfil ──────────────────────
  const ok = criarFake();
  const novo = await conc.adicionarConcorrente({ orgId: ORG, userId: USUARIO, handle: 'Concorrente.X', displayName: 'Concorrente X', cfg: CFG, f: ok.f, chave: CHAVE, agora: AGORA });
  assert.strictEqual(novo.handle, 'concorrente.x', 'handle guardado em minúsculo');
  const insereConc = ok.log.find((x) => x.metodo === 'POST' && x.u.pathname === '/rest/v1/competitor_accounts');
  assert.strictEqual(insereConc.corpo.added_by, USUARIO);
  assert.strictEqual(insereConc.corpo.display_name, 'Concorrente X');
  const insereSnap = ok.log.find((x) => x.metodo === 'POST' && x.u.pathname === '/rest/v1/competitor_snapshots');
  assert.strictEqual(insereSnap.corpo.competitor_id, novo.id);
  assert.strictEqual(insereSnap.corpo.followers_count, 1200);
  assert.strictEqual(insereSnap.corpo.source, 'business_discovery');
  assert.strictEqual(insereSnap.corpo.publicacoes_30d, 3);
  assert.strictEqual(insereSnap.corpo.engajamento_medio, 15.3);

  const dup = criarFake({ concorrentes: [{ id: C1, handle: 'concorrente.x' }] });
  await assert.rejects(conc.adicionarConcorrente({ orgId: ORG, userId: USUARIO, handle: 'concorrente.x', cfg: CFG, f: dup.f, chave: CHAVE, agora: AGORA }),
    (e) => e.status === 409);
  assert.ok(!dup.log.some((x) => x.u.hostname === 'graph.facebook.com'), 'já cadastrado: nem consulta a Meta');

  const naoLe = criarFake();
  await assert.rejects(conc.adicionarConcorrente({ orgId: ORG, userId: USUARIO, handle: 'pessoal', cfg: CFG, f: naoLe.f, chave: CHAVE, agora: AGORA }),
    (e) => e.status === 422);
  assert.ok(!naoLe.log.some((x) => x.metodo === 'POST' && x.u.pathname === '/rest/v1/competitor_accounts'),
    'perfil que não pode ser lido não entra na lista');

  const semConta = criarFake({ contas: [] });
  await assert.rejects(conc.adicionarConcorrente({ orgId: ORG, userId: USUARIO, handle: 'concorrente.x', cfg: CFG, f: semConta.f, chave: CHAVE, agora: AGORA }),
    (e) => e.status === 400 && /Conecte uma conta/.test(e.message));

  // ── Listagem: último resumo, histórico em ordem de data, concorrente sem consulta ─
  const lista = await conc.listarConcorrentes({ orgId: ORG, cfg: CFG, f: criarFake({
    concorrentes: [{ id: C1, handle: 'concorrente.x', display_name: 'Concorrente X' }, { id: C2, handle: 'vazio', display_name: null }],
    snapshots: [
      { competitor_id: C1, captured_at: ha(0), followers_count: 1210, media_count: 211, publicacoes_30d: 4, engajamento_medio: '15.5', amostra_publicacoes: 4, tipos: { post: 4 }, ultima_publicacao_em: ha(0) },
      { competitor_id: C1, captured_at: ha(1), followers_count: 1200, media_count: 210, publicacoes_30d: 3, engajamento_medio: '15.3', amostra_publicacoes: 4, tipos: { post: 2 }, ultima_publicacao_em: ha(1) }
    ] }).f });
  const c1 = lista.find((c) => c.id === C1);
  assert.strictEqual(c1.ultimo.seguidores, 1210, 'último resumo é o mais recente');
  assert.strictEqual(c1.ultimo.engajamentoMedio, 15.5, 'engajamento volta como número');
  assert.deepStrictEqual(c1.historico.map((h) => h.seguidores), [1200, 1210], 'histórico em ordem de data');
  assert.strictEqual(c1.historico[1].data, '2026-11-21', 'data no dia de Brasília');
  const c2 = lista.find((c) => c.id === C2);
  assert.strictEqual(c2.ultimo, null);
  assert.deepStrictEqual(c2.historico, []);

  // ── Handlers: papéis e validações ──────────────────────────────────────────────
  let h = await chamar('concorrentes', criarFake({ papel: 'viewer', concorrentes: [{ id: C1, handle: 'concorrente.x' }] }).f, { metodo: 'GET', query: { org: ORG } });
  assert.strictEqual(h.statusCode, 200);
  assert.strictEqual(h.body.papel, 'viewer', 'a tela usa o papel para mostrar ou esconder as ações');
  assert.strictEqual(h.body.concorrentes.length, 1);
  assert.strictEqual(h.body.avisoConsulta, null);

  h = await chamar('concorrentes', criarFake({ contas: [], concorrentes: [{ id: C1, handle: 'concorrente.x' }] }).f, { metodo: 'GET', query: { org: ORG } });
  assert.ok(/Conecte uma conta/.test(h.body.avisoConsulta), 'sem conta de consulta, a tela avisa');

  h = await chamar('concorrentes-adicionar', criarFake({ papel: 'viewer' }).f, { corpo: { orgId: ORG, handle: 'concorrente.x' } });
  assert.strictEqual(h.statusCode, 403, 'viewer não cadastra');

  h = await chamar('concorrentes-adicionar', criarFake().f, { corpo: { orgId: ORG, handle: 'com espaço' } });
  assert.strictEqual(h.statusCode, 400, 'handle inválido');

  h = await chamar('concorrentes-adicionar', criarFake().f, { corpo: { orgId: ORG, handle: '@concorrente.x', displayName: 'Concorrente X' } });
  assert.strictEqual(h.statusCode, 200);
  assert.strictEqual(h.body.concorrente.handle, 'concorrente.x');

  h = await chamar('concorrentes-adicionar', criarFake().f, { corpo: { orgId: ORG, handle: 'pessoal' } });
  assert.strictEqual(h.statusCode, 422, 'perfil ilegível na hora do cadastro');
  assert.ok(/@pessoal/.test(h.body.error));

  h = await chamar('concorrentes-remover', criarFake({ papel: 'viewer' }).f, { corpo: { orgId: ORG, id: C1 } });
  assert.strictEqual(h.statusCode, 403);

  h = await chamar('concorrentes-remover', criarFake().f, { corpo: { orgId: ORG, id: 'nao-e-uuid' } });
  assert.strictEqual(h.statusCode, 400);

  const removeFake = criarFake({ concorrentes: [{ id: C1, handle: 'concorrente.x' }] });
  h = await chamar('concorrentes-remover', removeFake.f, { corpo: { orgId: ORG, id: C1 } });
  assert.strictEqual(h.statusCode, 200);
  const apagou = removeFake.log.find((x) => x.metodo === 'DELETE');
  assert.strictEqual(apagou.u.searchParams.get('id'), 'eq.' + C1, 'apaga pelo id, dentro da organização');
  assert.strictEqual(apagou.u.searchParams.get('organization_id'), 'eq.' + ORG);
  assert.strictEqual(removeFake.estado.concorrentes.length, 0);

  // Atualização manual: um concorrente falha (perfil ilegível), o outro atualiza.
  const syncFake = criarFake({ concorrentes: [{ id: C1, handle: 'concorrente.x' }, { id: C2, handle: 'pessoal' }] });
  h = await chamar('concorrentes-sincronizar', syncFake.f, { corpo: { orgId: ORG } });
  assert.strictEqual(h.statusCode, 200);
  assert.strictEqual(h.body.ok, true);
  const resultadoPorHandle = Object.fromEntries(h.body.resultados.map((x) => [x.handle, x]));
  assert.strictEqual(resultadoPorHandle['concorrente.x'].ok, true);
  assert.strictEqual(resultadoPorHandle['pessoal'].ok, false, 'uma falha não para os outros');
  assert.ok(/@pessoal/.test(resultadoPorHandle['pessoal'].erro));
  assert.strictEqual(syncFake.log.filter((x) => x.metodo === 'POST' && x.u.pathname === '/rest/v1/competitor_snapshots').length, 1,
    'só o concorrente que respondeu ganha resumo');

  h = await chamar('concorrentes-sincronizar', criarFake({ papel: 'viewer' }).f, { corpo: { orgId: ORG } });
  assert.strictEqual(h.statusCode, 403);

  // Rotina diária: também atualiza os concorrentes (as contas são puladas aqui, sem conexão ativa no cron).
  const cronFake = criarFake({ concorrentes: [{ id: C1, handle: 'concorrente.x' }] });
  h = await chamar('sincronizar-cron', cronFake.f, { metodo: 'GET', cabecalhos: { authorization: 'Bearer segredo' }, env: { CRON_SECRET: 'segredo' } });
  assert.strictEqual(h.statusCode, 200);
  assert.strictEqual(h.body.concorrentes.length, 1);
  assert.strictEqual(h.body.concorrentes[0].ok, true);
  assert.strictEqual(h.body.concorrentes[0].consultados, 1);

  console.log('ok (concorrentes)');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
