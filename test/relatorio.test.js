// Testa os relatórios: períodos (semanal, mensal, personalizado), variação contra o período anterior,
// publicações do período, CSV e as permissões da rota. Sem rede: o Supabase é simulado.
const assert = require('assert');
const relatorio = require('../lib/relatorio');
const analise = require('../lib/analise-api');

const CFG = { url: 'https://projeto.supabase.test', anon: 'a', service: 's' };
const ORG = '22222222-2222-2222-2222-222222222222';
const USUARIO = '11111111-1111-1111-1111-111111111111';
const CONTA = '33333333-3333-3333-3333-333333333333';
const CONTA_ESTRANHA = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
const C1 = '7c1d0c00-0000-4000-8000-000000000001';
const AGORA = Date.parse('2026-11-21T15:00:00Z');

const resposta = (status, corpo) => {
  const texto = corpo === undefined ? '' : JSON.stringify(corpo);
  return { ok: status >= 200 && status < 300, status, text: async () => texto, json: async () => JSON.parse(texto || '[]') };
};

// Período atual: 11 e 12/11. Anterior de mesmo tamanho: 09 e 10/11 (alcance 100 + 100 = 200).
const LINHAS = [
  { metric_date: '2026-11-09', social_account_id: CONTA, reach: 100, views: 110, engagement: 5, website_clicks: 1, followers_count: 990 },
  { metric_date: '2026-11-10', social_account_id: CONTA, reach: 100, views: 120, engagement: 5, website_clicks: 1, followers_count: 992 },
  { metric_date: '2026-11-11', social_account_id: CONTA, reach: 120, views: 150, engagement: 12, website_clicks: 3, followers_count: 1002 },
  { metric_date: '2026-11-12', social_account_id: CONTA, reach: 130, views: 140, engagement: 13, website_clicks: 4, followers_count: 1004 }
];
const POSTS = [
  { id: 'p1', social_account_id: CONTA, content_type: 'reel', permalink: 'https://www.instagram.com/reel/1/', thumbnail_url: null, caption: 'L'.repeat(80), published_at: '2026-11-15T15:00:00Z' },
  { id: 'p2', social_account_id: CONTA, content_type: 'post', permalink: null, thumbnail_url: null, caption: 'Outra; com ponto e vírgula', published_at: '2026-11-18T12:00:00Z' },
  { id: 'p0', social_account_id: CONTA, content_type: 'post', permalink: null, thumbnail_url: null, caption: 'Antiga', published_at: '2026-10-01T12:00:00Z' }
];
const INSIGHTS = [
  { social_post_id: 'p1', reach: 500, views: 800, likes: 40, comments: 4, shares: 1, saves: 2, engagement: 47, follows_gained: null, collected_at: '2026-11-20T00:00:00Z' },
  { social_post_id: 'p2', reach: 300, views: 400, likes: 20, comments: 6, shares: 0, saves: 1, engagement: 27, follows_gained: 3, collected_at: '2026-11-20T00:00:00Z' }
];
const SNAPS = [
  { competitor_id: C1, captured_at: '2026-11-20T12:00:00Z', followers_count: 1200, media_count: 210, publicacoes_30d: 3, engajamento_medio: '15.3', amostra_publicacoes: 4, tipos: { post: 2 }, ultima_publicacao_em: '2026-11-19T10:00:00Z' }
];

function criarFake({ papel = 'viewer', linhas = LINHAS, posts = POSTS } = {}) {
  return async (url) => {
    const u = new URL(url);
    if (u.pathname === '/auth/v1/user') return resposta(200, { id: USUARIO });
    if (u.pathname === '/rest/v1/organization_members') return resposta(200, papel ? [{ role: papel }] : []);
    if (u.pathname === '/rest/v1/account_insights') return resposta(200, linhas);
    if (u.pathname === '/rest/v1/social_accounts') return resposta(200, [{ id: CONTA, platform: 'instagram', username: 'academia', external_id: '1784140' }]);
    if (u.pathname === '/rest/v1/audience_insights') return resposta(200, []);
    if (u.pathname === '/rest/v1/social_posts') return resposta(200, posts);
    if (u.pathname === '/rest/v1/post_insights') return resposta(200, INSIGHTS);
    if (u.pathname === '/rest/v1/competitor_accounts') return resposta(200, [{ id: C1, handle: 'concorrente.x', display_name: null }]);
    if (u.pathname === '/rest/v1/competitor_snapshots') return resposta(200, SNAPS);
    return resposta(404, {});
  };
}

const gerar = (extra = {}) => relatorio.gerarRelatorio({
  orgId: ORG, tipo: 'personalizado', ini: '2026-11-11', fim: '2026-11-12', contaId: null,
  agora: AGORA, cfg: CFG, f: criarFake(), ...extra
});

(async () => {
  // ── Períodos ───────────────────────────────────────────────────────────────────
  assert.deepStrictEqual(relatorio.periodoDoTipo('semanal', AGORA), { ini: '2026-11-14', fim: '2026-11-20' }, 'semanal: 7 dias até ontem');
  assert.deepStrictEqual(relatorio.periodoDoTipo('mensal', AGORA), { ini: '2026-10-01', fim: '2026-10-31' }, 'mensal: mês anterior completo');
  assert.deepStrictEqual(relatorio.periodoDoTipo('mensal', Date.parse('2027-01-01T12:00:00Z')), { ini: '2026-12-01', fim: '2026-12-31' }, 'mensal na virada do ano');
  assert.deepStrictEqual(relatorio.periodoDoTipo('personalizado', AGORA, '2026-11-01', '2026-12-31'), { ini: '2026-11-01', fim: '2026-11-20' }, 'personalizado não passa de ontem');

  // ── Variação ───────────────────────────────────────────────────────────────────
  assert.strictEqual(relatorio.variacao(250, 200), 25);
  assert.strictEqual(relatorio.variacao(null, 200), null, 'sem dado atual: sem variação');
  assert.strictEqual(relatorio.variacao(5, 0), null, 'anterior zero: sem variação, nunca infinito');

  // ── Relatório personalizado 11 a 12/11 ─────────────────────────────────────────
  const r = await gerar();
  assert.strictEqual(r.titulo, 'Relatório personalizado');
  assert.deepStrictEqual(r.periodo, { ini: '2026-11-11', fim: '2026-11-12', dias: 2 });
  assert.deepStrictEqual(r.periodoAnterior, { ini: '2026-11-09', fim: '2026-11-10' });
  const alcance = r.indicadores.find((i) => i.chave === 'alcance');
  assert.deepStrictEqual([alcance.valor, alcance.anterior, alcance.variacao], [250, 200, 25]);
  assert.strictEqual(r.seguidores.noFim, 1004);
  assert.strictEqual(r.seguidores.saldo, 2, 'saldo: fim (1004) menos início (1002)');
  assert.strictEqual(r.diario.length, 2);
  assert.strictEqual(r.diario[0].alcance, 120);
  assert.strictEqual(r.publicacoes.length, 0, 'nenhuma publicação entre 11 e 12/11');
  assert.strictEqual(r.semDados, false);
  assert.strictEqual(r.escopo, 'todas as contas do Instagram');
  assert.ok(r.limitacoes.some((x) => /Impressões/.test(x)), 'impressões aparece como limitação, não como número');

  // ── Publicações dentro do período: legenda cortada, horário de Brasília ────────
  const comPosts = await gerar({ ini: '2026-11-11', fim: '2026-11-18' });
  assert.strictEqual(comPosts.publicacoes.length, 2, 'p1 (15/11) e p2 (18/11); a de outubro fica de fora');
  const p1 = comPosts.publicacoes.find((p) => p.tipo === 'Reel');
  assert.strictEqual(p1.legenda.length, 60, 'legenda cortada em 60 caracteres');
  assert.strictEqual(p1.hora, 12, '15h UTC = 12h em Brasília');
  assert.strictEqual(p1.conta, 'academia');
  assert.strictEqual(p1.seguidoresGerados, null, 'reel sem seguidores gerados fica null');
  assert.strictEqual(comPosts.concorrentes.length, 1);
  assert.strictEqual(comPosts.concorrentes[0].perfil, 'concorrente.x');
  assert.strictEqual(comPosts.concorrentes[0].capturadoEm, '2026-11-20');

  // ── CSV ────────────────────────────────────────────────────────────────────────
  const csv = relatorio.csvDoRelatorio(comPosts);
  assert.ok(csv.startsWith('﻿'), 'BOM para o Excel abrir com acentos');
  const linhas = csv.slice(1).split('\r\n'); // tira o BOM da primeira linha
  assert.ok(linhas.includes('Relatório;Relatório personalizado'));
  assert.ok(linhas.includes('Alcance;250;200;25'), 'valor, anterior e variação na mesma linha');
  assert.ok(linhas.includes('Seguidores no fim do período;1004'));
  assert.ok(linhas.some((x) => x.startsWith('Data;Alcance;')), 'cabeçalho da tabela diária');
  assert.ok(csv.includes('"Outra; com ponto e vírgula"'), 'campo com ";" vai entre aspas');
  assert.ok(csv.includes('n/d'), 'dado ausente vira n/d, nunca zero');
  assert.ok(csv.includes('15,3'), 'decimal com vírgula');
  assert.ok(linhas.some((x) => x.startsWith('Limitações')));

  // ── Sem dado no período ────────────────────────────────────────────────────────
  const vazio = await gerar({ ini: '2026-11-01', fim: '2026-11-05' });
  assert.strictEqual(vazio.semDados, true);
  assert.ok(vazio.limitacoes.some((x) => /Sem métricas diárias/.test(x)));
  assert.strictEqual(vazio.indicadores.find((i) => i.chave === 'alcance').valor, null, 'sem dado: null, não zero');

  // ── Mensal (outubro não tem dado nesta simulação) ──────────────────────────────
  const mensal = await gerar({ tipo: 'mensal', ini: undefined, fim: undefined });
  assert.deepStrictEqual(mensal.periodo, { ini: '2026-10-01', fim: '2026-10-31', dias: 31 });
  assert.strictEqual(mensal.publicacoes.length, 1, 'a publicação de 01/10 entra no mensal de outubro');
  assert.strictEqual(mensal.semDados, false, 'tem publicação, então não é período sem dado');
  assert.strictEqual(mensal.indicadores[0].valor, null, 'sem métrica diária da conta no mês: null');
  assert.ok(mensal.limitacoes.some((x) => /Sem métricas diárias/.test(x)));

  // ── Erros ──────────────────────────────────────────────────────────────────────
  await assert.rejects(gerar({ ini: '2026-11-25', fim: '2026-11-30' }), (e) => e instanceof relatorio.ErroRelatorio && /até ontem/.test(e.message));
  await assert.rejects(gerar({ ini: undefined }), (e) => e instanceof relatorio.ErroRelatorio && /datas/.test(e.message));
  await assert.rejects(gerar({ ini: '2026-11-12', fim: '2026-11-11' }), (e) => e instanceof relatorio.ErroRelatorio && /inicial/.test(e.message));
  await assert.rejects(gerar({ tipo: 'anual' }), (e) => e instanceof relatorio.ErroRelatorio);
  await assert.rejects(gerar({ contaId: CONTA_ESTRANHA }), (e) => e instanceof relatorio.ErroRelatorio && /não encontrada/.test(e.message));

  const porConta = await gerar({ contaId: CONTA });
  assert.strictEqual(porConta.escopo, '@academia', 'com conta escolhida, o escopo mostra a conta');

  // ── Rota: leitura para membros, validações ─────────────────────────────────────
  const deps = (f) => ({ env: {}, config: CFG, fetch: f, agora: () => AGORA });
  const chamar = async (f, query) => {
    const res = { statusCode: 200, body: undefined, status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; return this; } };
    const req = { method: 'GET', query, headers: { authorization: 'Bearer t' }, on() { return req; } };
    await analise.HANDLERS['relatorio'](req, res, deps(f));
    return res;
  };

  let h = await chamar(criarFake({ papel: 'viewer' }), { org: ORG, tipo: 'personalizado', ini: '2026-11-11', fim: '2026-11-12' });
  assert.strictEqual(h.statusCode, 200, 'viewer lê o relatório');
  assert.strictEqual(h.body.relatorio.indicadores[0].valor, 250);
  assert.ok(h.body.csv.startsWith('﻿'));

  h = await chamar(criarFake({ papel: null }), { org: ORG, tipo: 'semanal' });
  assert.strictEqual(h.statusCode, 403, 'quem não é membro não lê');

  h = await chamar(criarFake(), { org: ORG, tipo: 'personalizado' });
  assert.strictEqual(h.statusCode, 400, 'personalizado sem datas');

  h = await chamar(criarFake(), { org: ORG, tipo: 'semanal', conta: 'nao-e-uuid' });
  assert.strictEqual(h.statusCode, 400, 'conta com formato inválido');

  console.log('ok (relatorio)');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
