// Fase 3: ig-viral (contra a própria mediana) e visualizações de Reels dos concorrentes.
// Sem rede: a Meta é uma função falsa.
const assert = require('assert');
const I = require('../analise-insights.js');
const conc = require('../lib/concorrentes');

// ── destaquesDaMediana ────────────────────────────────────────────────────────
{
  // Mediana de [90, 95, 100, 110, 120, 400] = (100 + 110) / 2 = 105. Limite de 1,5x = 157,5.
  const posts = [90, 95, 100, 110, 120, 400].map((v, i) => ({ id: `p${i}`, visualizacoes: v }));
  const r = I.destaquesDaMediana(posts, 'visualizacoes');
  assert.strictEqual(r.suficiente, true);
  assert.strictEqual(r.mediana, 105);
  assert.deepStrictEqual(r.itens.map((x) => x.id), ['p5'], 'só o post de 400 passa de 1,5 vez a mediana');
  assert.strictEqual(r.itens[0].vezesMediana, 3.8, '400 / 105 arredondado');
}
{
  // Menos de 4 publicações com medição: não há mediana confiável
  const r = I.destaquesDaMediana([{ visualizacoes: 10 }, { visualizacoes: 900 }], 'visualizacoes');
  assert.strictEqual(r.suficiente, false);
  assert.deepStrictEqual(r.itens, []);
}
{
  // Campo ausente ou não numérico é ignorado (não conta como zero)
  const posts = [{ visualizacoes: 100 }, { visualizacoes: null }, { }, { visualizacoes: 100 }, { visualizacoes: 100 }, { visualizacoes: 500 }];
  const r = I.destaquesDaMediana(posts, 'visualizacoes');
  assert.strictEqual(r.mediana, 100, 'a mediana usa só os 4 valores medidos');
  assert.deepStrictEqual(r.itens.map((x) => x.valor), [500]);
}
{
  // Mediana zero: não há destaque contra ela
  const r = I.destaquesDaMediana([0, 0, 0, 50].map((v) => ({ visualizacoes: v })), 'visualizacoes');
  assert.strictEqual(r.mediana, 0);
  assert.deepStrictEqual(r.itens, []);
}

// ── visualizações de Reels no resumo do concorrente ──────────────────────────
{
  const agora = Date.parse('2026-11-21T12:00:00Z');
  const midias = [
    { media_type: 'VIDEO', timestamp: '2026-11-20T10:00:00+0000', view_count: 1000 },
    { media_type: 'VIDEO', timestamp: '2026-11-19T10:00:00+0000', view_count: 3000 },
    { media_type: 'IMAGE', timestamp: '2026-11-18T10:00:00+0000' }
  ];
  const r = conc.resumirPublicacoes(midias, agora);
  assert.strictEqual(r.visualizacoesReelsMedia, 2000, 'média só dos itens com view_count');
  assert.strictEqual(r.reelsComViews, 2);
  const semViews = conc.resumirPublicacoes([{ media_type: 'IMAGE', timestamp: '2026-11-18T10:00:00+0000' }], agora);
  assert.strictEqual(semViews.visualizacoesReelsMedia, null, 'sem view_count, a média fica vazia (não vira zero)');
  assert.strictEqual(semViews.reelsComViews, 0);
}

// ── buscarPerfil: pede view_count e, se a Meta recusar, pede de novo sem ele ──
(async () => {
  const chamadas = [];
  const respostaMeta = (obj, status = 200) => ({ ok: status < 400, status, text: async () => JSON.stringify(obj) });
  const perfilOk = { business_discovery: { followers_count: 10, media_count: 2, media: { data: [] } } };

  {
    chamadas.length = 0;
    const f = async (url) => { chamadas.push(url); return respostaMeta(perfilOk); };
    const p = await conc.buscarPerfil({ igUserId: '123', token: 't', handle: 'x', f });
    assert.strictEqual(p.followers_count, 10);
    assert.ok(decodeURIComponent(chamadas[0]).includes('view_count'), 'primeiro pedido já traz view_count');
    assert.strictEqual(chamadas.length, 1, 'sem recusa, uma chamada só');
  }

  {
    chamadas.length = 0;
    const f = async (url) => {
      chamadas.push(url);
      if (chamadas.length === 1) return respostaMeta({ error: { message: 'Tried accessing nonexisting field (view_count)' } }, 400);
      return respostaMeta(perfilOk);
    };
    const p = await conc.buscarPerfil({ igUserId: '123', token: 't', handle: 'x', f });
    assert.strictEqual(p.followers_count, 10, 'a segunda tentativa funciona');
    assert.strictEqual(chamadas.length, 2);
    assert.ok(!decodeURIComponent(chamadas[1]).includes('view_count'), 'a repetição pede sem view_count');
  }

  {
    chamadas.length = 0;
    const f = async (url) => { chamadas.push(url); return respostaMeta({ error: { message: 'Token inválido' } }, 400); };
    await assert.rejects(() => conc.buscarPerfil({ igUserId: '123', token: 't', handle: 'x', f }), 'erro que não é de view_count não repete');
    assert.strictEqual(chamadas.length, 1);
  }

  console.log('ok (viral)');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
