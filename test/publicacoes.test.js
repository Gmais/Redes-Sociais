// Testa a lista de publicações (seção Publicações): ordenação, medição mais recente, filtros,
// leitura paginada das medições e o handler. Sem rede.
const assert = require('assert');
const publicacoes = require('../lib/publicacoes');
const analise = require('../lib/analise-api');

const CFG = { url: 'https://projeto.supabase.test', anon: 'a', service: 's' };
const ORG = '22222222-2222-2222-2222-222222222222';
const USUARIO = '11111111-1111-1111-1111-111111111111';
const A = '33333333-3333-3333-3333-333333333333';
const B = '44444444-4444-4444-4444-444444444444';

const POSTS = [
  { id: 'p1', social_account_id: A, content_type: 'reel', permalink: 'https://www.instagram.com/reel/1/', thumbnail_url: 'https://cdn.test/1.jpg', caption: 'Treino de hoje 💪', published_at: '2026-11-20T12:00:00Z' },
  { id: 'p2', social_account_id: B, content_type: 'post', permalink: 'https://www.instagram.com/p/2/', thumbnail_url: null, caption: null, published_at: '2026-11-19T12:00:00Z' },
  { id: 'p3', social_account_id: A, content_type: 'story', permalink: null, thumbnail_url: null, caption: null, published_at: '2026-11-18T12:00:00Z' },
  { id: 'p4', social_account_id: B, content_type: 'carousel', permalink: null, thumbnail_url: null, caption: 'Antigo', published_at: '2026-11-10T12:00:00Z' }
];
// p1 tem duas medições: a de 19/11 (antiga) e a de 21/11 (a que vale).
const MEDICOES = [
  { social_post_id: 'p1', reach: 500, likes: 40, collected_at: '2026-11-21T00:00:00Z' },
  { social_post_id: 'p1', reach: 100, likes: 10, collected_at: '2026-11-19T00:00:00Z' },
  { social_post_id: 'p2', reach: 300, follows_gained: 4, collected_at: '2026-11-21T00:00:00Z' },
  { social_post_id: 'p4', reach: 900, collected_at: '2026-11-21T00:00:00Z' }
];
const CONTAS = [
  { id: A, username: 'academia' },
  { id: B, username: 'sorveteria' }
];

const resposta = (status, corpo) => {
  const texto = corpo === undefined ? '' : JSON.stringify(corpo);
  return { ok: status >= 200 && status < 300, status, text: async () => texto, json: async () => JSON.parse(texto || '[]') };
};

function fakeF({ postsRetorno = POSTS, medicoes = MEDICOES, contas = CONTAS, papel = 'viewer', urls = [] } = {}) {
  return async (url) => {
    const u = new URL(url);
    urls.push(u.pathname + u.search);
    if (u.pathname === '/auth/v1/user') return resposta(200, { id: USUARIO });
    if (u.pathname === '/rest/v1/organization_members') return resposta(200, papel ? [{ role: papel }] : []);
    if (u.pathname === '/rest/v1/social_accounts') return resposta(200, contas);
    if (u.pathname === '/rest/v1/social_posts') return resposta(200, postsRetorno);
    if (u.pathname === '/rest/v1/post_insights') {
      const inicio = Number(u.searchParams.get('offset') || 0);
      return resposta(200, medicoes.slice(inicio, inicio + 1000)); // o PostgREST corta em 1000 linhas
    }
    return resposta(404, {});
  };
}

(async () => {
  // ── Ordenação (função pura) ─────────────────────────────────────────────────
  const base = [{ id: 'a', alcance: 10 }, { id: 'b', alcance: null }, { id: 'c', alcance: 90 }];
  assert.deepStrictEqual(publicacoes.ordenar(base, 'alcance').map((x) => x.id), ['c', 'a', 'b'], 'maior alcance primeiro; sem dado vai para o fim');
  assert.deepStrictEqual(publicacoes.ordenar(base, 'data').map((x) => x.id), ['a', 'b', 'c'], 'ordem "data" mantém a ordem recebida');
  assert.deepStrictEqual(publicacoes.ordenar(base, 'nao-existe').map((x) => x.id), ['a', 'b', 'c'], 'ordem desconhecida não quebra');
  assert.deepStrictEqual(base.map((x) => x.id), ['a', 'b', 'c'], 'não altera a lista original');

  // ── Consulta: medição mais recente, nulls, nomes das contas ─────────────────
  const r = await publicacoes.consultarPublicacoes({ orgId: ORG, cfg: CFG, f: fakeF() });
  const porId = Object.fromEntries(r.publicacoes.map((p) => [p.id, p]));
  assert.strictEqual(porId.p1.alcance, 500, 'usa a medição mais recente, não a antiga');
  assert.strictEqual(porId.p1.curtidas, 40);
  assert.strictEqual(porId.p3.alcance, null, 'publicação sem medição: null, nunca zero');
  assert.strictEqual(porId.p2.seguidoresGerados, 4, 'seguidores gerados vêm da medição do post');
  assert.strictEqual(porId.p1.seguidoresGerados, null, 'reel sem dado de seguidores fica null');
  assert.strictEqual(porId.p1.conta, 'academia');
  assert.strictEqual(porId.p2.conta, 'sorveteria');
  assert.strictEqual(porId.p1.tipoLabel, 'Reel');
  assert.strictEqual(porId.p2.tipoLabel, 'Post');
  assert.strictEqual(porId.p3.tipoLabel, 'Story');
  assert.strictEqual(porId.p4.tipoLabel, 'Carrossel');
  assert.deepStrictEqual(r.publicacoes.map((p) => p.id), ['p1', 'p2', 'p3', 'p4'], 'padrão: mais recentes primeiro');
  assert.deepStrictEqual(r.contas, [{ id: A, username: 'academia' }, { id: B, username: 'sorveteria' }], 'devolve as contas do Instagram para o filtro');

  // Ordenação por alcance: p4 (900), p1 (500), p2 (300), p3 (sem dado, no fim)
  const porAlcance = await publicacoes.consultarPublicacoes({ orgId: ORG, cfg: CFG, f: fakeF(), ordem: 'alcance' });
  assert.deepStrictEqual(porAlcance.publicacoes.map((p) => p.id), ['p4', 'p1', 'p2', 'p3']);

  // Legenda cortada por caractere (não quebra emoji) e em 140
  const longa = await publicacoes.consultarPublicacoes({ orgId: ORG, cfg: CFG,
    f: fakeF({ postsRetorno: [{ ...POSTS[0], caption: '💪'.repeat(150) }] }) });
  assert.strictEqual(longa.publicacoes[0].legenda, '💪'.repeat(140), 'legenda tem no máximo 140 caracteres, sem partir emoji');

  // ── Filtros vão para a consulta, sempre presos à organização ────────────────
  const urls = [];
  await publicacoes.consultarPublicacoes({ orgId: ORG, cfg: CFG, f: fakeF({ urls }), tipo: 'reel', contaId: A, limite: 500 });
  const urlPosts = urls.find((u) => u.startsWith('/rest/v1/social_posts'));
  assert.ok(urlPosts.includes('content_type=eq.reel'), 'filtro de tipo');
  assert.ok(urlPosts.includes('social_account_id=eq.' + A), 'filtro de conta');
  assert.ok(urlPosts.includes('organization_id=eq.' + ORG), 'sempre filtra pela organização');
  assert.ok(urlPosts.includes('limit=200'), 'limite máximo de 200 publicações');

  const urlsInvalido = [];
  await publicacoes.consultarPublicacoes({ orgId: ORG, cfg: CFG, f: fakeF({ urls: urlsInvalido }), tipo: 'foto' });
  assert.ok(!urlsInvalido.find((u) => u.startsWith('/rest/v1/social_posts')).includes('content_type=eq.'), 'tipo fora da lista é ignorado');

  // ── Paginação das medições: a medição de p3 está depois de 1000 linhas de outros posts ──
  const enchimento = Array.from({ length: 1000 }, (_, i) => ({ social_post_id: 'outra-' + i, reach: 1, collected_at: '2026-11-21T00:00:00Z' }));
  const grande = await publicacoes.consultarPublicacoes({ orgId: ORG, cfg: CFG,
    f: fakeF({ medicoes: [...enchimento, { social_post_id: 'p3', reach: 77, collected_at: '2026-11-10T00:00:00Z' }] }) });
  assert.strictEqual(grande.publicacoes.find((p) => p.id === 'p3').alcance, 77, 'lê as páginas seguintes do limite de 1000 linhas');

  // ── Sem publicações: lista vazia, contas continuam aparecendo ───────────────
  const vazio = await publicacoes.consultarPublicacoes({ orgId: ORG, cfg: CFG, f: fakeF({ postsRetorno: [] }) });
  assert.deepStrictEqual(vazio.publicacoes, []);
  assert.strictEqual(vazio.contas.length, 2);

  // ── Handler: papel, validação e ordenação ───────────────────────────────────
  const deps = (f) => ({ env: {}, config: CFG, fetch: f, agora: () => Date.parse('2026-11-21T15:00:00Z') });
  const chamar = async (f, query, method = 'GET') => {
    const res = { statusCode: 200, body: undefined, status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; return this; } };
    const req = { method, query, headers: { authorization: 'Bearer t' }, on() { return req; } };
    await analise.HANDLERS['publicacoes'](req, res, deps(f));
    return res;
  };

  let h = await chamar(fakeF(), { org: ORG, ordem: 'alcance' });
  assert.strictEqual(h.statusCode, 200);
  assert.deepStrictEqual(h.body.publicacoes.map((p) => p.id), ['p4', 'p1', 'p2', 'p3']);
  assert.strictEqual(h.body.contas.length, 2);

  h = await chamar(fakeF(), { org: ORG, ordem: 'lixo' });
  assert.strictEqual(h.statusCode, 200, 'ordem desconhecida cai no padrão');
  assert.deepStrictEqual(h.body.publicacoes.map((p) => p.id), ['p1', 'p2', 'p3', 'p4']);

  h = await chamar(fakeF({ papel: null }), { org: ORG });
  assert.strictEqual(h.statusCode, 403, 'quem não é membro não lê');

  h = await chamar(fakeF(), { org: ORG, tipo: 'foto' });
  assert.strictEqual(h.statusCode, 400, 'tipo inválido');

  h = await chamar(fakeF(), { org: ORG, conta: 'nao-e-uuid' });
  assert.strictEqual(h.statusCode, 400, 'conta com formato inválido');

  h = await chamar(fakeF(), { org: ORG }, 'POST');
  assert.strictEqual(h.statusCode, 405, 'só GET');

  console.log('ok (publicacoes)');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
