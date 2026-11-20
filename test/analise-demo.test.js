// Testa o gerador de dados de demonstração da Análise das Redes Sociais (sem rede).
const assert = require('assert');
const D = require('../analise-demo');

// Determinismo: o mesmo período gera exatamente os mesmos números.
const a1 = JSON.stringify(D.serie('2026-10-01', '2026-10-30'));
const a2 = JSON.stringify(D.serie('2026-10-01', '2026-10-30'));
assert.strictEqual(a1, a2, 'a série precisa ser determinística');

// Mesmo dia visto em períodos diferentes dá o mesmo valor.
const dentro = D.serie('2026-10-15', '2026-10-15')[0];
const emOutro = D.serie('2026-09-01', '2026-10-30').find((d) => d.data === '2026-10-15');
assert.deepStrictEqual(dentro, emOutro, 'o valor de um dia não pode depender do período pedido');

// Tamanho da série = número de dias do período.
assert.strictEqual(D.serie('2026-10-01', '2026-10-30').length, 30);

// Seguidor total: a variação diária é exatamente ganhos - perdidos.
const s = D.serie('2026-03-01', '2026-03-20');
for (let i = 1; i < s.length; i++) {
  assert.strictEqual(s[i].seguidores - s[i - 1].seguidores, s[i].ganhos - s[i].perdidos, 'dia ' + s[i].data);
}

// Coerência entre métricas em todos os dias.
D.serie('2025-06-01', '2026-11-20').forEach((d) => {
  assert.ok(d.alcance > 0, 'alcance > 0 em ' + d.data);
  assert.ok(d.impressoes >= d.alcance, 'impressões >= alcance em ' + d.data);
  assert.ok(d.engajamento <= d.alcance, 'engajamento <= alcance em ' + d.data);
  assert.ok(d.cliques <= d.visitas, 'cliques <= visitas em ' + d.data);
  assert.ok(d.ganhos >= 0 && d.perdidos >= 0, 'seguidores não negativos em ' + d.data);
});

// Totais somam os dias.
const t = D.totais(s);
assert.strictEqual(t.alcance, s.reduce((acc, d) => acc + d.alcance, 0));

// Comparação: período anterior tem o mesmo tamanho e termina na véspera do atual.
const c = D.comparar('2026-10-21', '2026-11-19');
assert.strictEqual(c.dias, 30);
assert.strictEqual(c.antFim, '2026-10-20');
assert.strictEqual(c.antIni, '2026-09-21');
assert.strictEqual(c.comparavel, true);
assert.strictEqual(c.serie.length, 30);
assert.strictEqual(c.serie[0].data, '2026-10-21');
assert.strictEqual(c.serie[c.serie.length - 1].data, '2026-11-19');

// Sem histórico suficiente (antes da ANCORA), não há comparação.
const semBase = D.comparar('2025-01-10', '2025-01-20');
assert.strictEqual(semBase.comparavel, false);

// Variação percentual.
assert.strictEqual(D.variacao(110, 100), 10);
assert.strictEqual(D.variacao(90, 100), -10);
assert.strictEqual(D.variacao(5, 0), null, 'sem base não há variação');
assert.strictEqual(D.variacao(5, null), null);

// Datas.
assert.strictEqual(D.addDays('2026-03-01', -1), '2026-02-28');
assert.strictEqual(D.diasEntre('2026-02-01', '2026-02-28'), 28);
assert.strictEqual(D.diaSemana('2026-11-20'), 5, '20/11/2026 é sexta-feira');

// Público: cada grupo soma 100%.
const p = D.publico();
['idade', 'genero', 'cidades'].forEach((g) => {
  const soma = p[g].reduce((acc, x) => acc + x.pct, 0);
  assert.strictEqual(soma, 100, g + ' deve somar 100%');
});

// Mapa de calor: 7 x 24, valores entre 0 e 1.
const m = D.mapaDeCalor();
assert.strictEqual(m.length, 7);
m.forEach((linha) => {
  assert.strictEqual(linha.length, 24);
  linha.forEach((v) => assert.ok(v >= 0 && v <= 1, 'intensidade fora de [0,1]: ' + v));
});

// Os melhores horários vêm em ordem decrescente e são 3 quando pedidos.
const top = D.melhoresHorarios(m, 3);
assert.strictEqual(top.length, 3);
assert.ok(top[0].valor >= top[1].valor && top[1].valor >= top[2].valor);

console.log('ok (analise-demo)');
