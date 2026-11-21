// Testa os cálculos do painel de Análise (analise-insights.js): variação, formatação, linhas SVG,
// médias, destaques e datas. Sem rede e sem navegador.
const assert = require('assert');
const I = require('../analise-insights.js');

// Variação contra o período anterior
assert.strictEqual(I.variacao(250, 200), 25);
assert.strictEqual(I.variacao(100, 150), -33.3);
assert.strictEqual(I.variacao(null, 200), null, 'sem dado atual: sem variação');
assert.strictEqual(I.variacao(5, 0), null, 'base zero: sem variação, nunca infinito');
assert.strictEqual(I.variacao(5, null), null);

// Sinal: alta, queda e neutro
assert.strictEqual(I.tomDe(1), 'alta');
assert.strictEqual(I.tomDe(-1), 'queda');
assert.strictEqual(I.tomDe(0), 'neutro');
assert.strictEqual(I.tomDe(null), 'neutro');

// Formatação: nulo vira "n/d", nunca zero
assert.strictEqual(I.fmtInt(null), 'n/d');
assert.strictEqual(I.fmtDec(undefined), 'n/d');
assert.ok(I.fmtInt(1234.6).includes('235'), 'arredonda');
assert.strictEqual(I.fmtSinal(25), '+25');
assert.strictEqual(I.fmtSinal(-4.5), '-4,5');
assert.strictEqual(I.fmtSinal(null), 'n/d');

// Média: nulo não conta como zero
assert.strictEqual(I.media([1, null, 3]), 2);
assert.strictEqual(I.media([]), null);
assert.strictEqual(I.media([null, null]), null);

// Linha SVG: nulos ficam de fora; com menos de 2 pontos não desenha
const linha = I.caminhoLinha([null, 1, 2, 3], 100, 40);
assert.ok(linha.startsWith('M'), 'começa com M');
assert.ok(linha.includes('L'), 'liga os pontos');
assert.strictEqual(I.caminhoLinha([5], 100, 40), '', 'um ponto não vira linha');
assert.strictEqual(I.caminhoLinha([null, null, 4], 100, 40), '', 'um valor só não vira linha');

// Resumo por tipo e ordenação das publicações
const pubs = [
  { tipo: 'reel', engajamento: 40, alcance: 500 },
  { tipo: 'reel', engajamento: 20, alcance: null },
  { tipo: 'post', engajamento: null, alcance: 100 }
];
const porTipo = I.resumoPorTipo(pubs);
assert.deepStrictEqual(porTipo.reel, { quantidade: 2, engajamentoMedio: 30, alcanceMedio: 500 });
assert.strictEqual(porTipo.post.engajamentoMedio, null, 'sem medição: null');
const top = I.topPublicacoes(pubs, 2);
assert.strictEqual(top[0].engajamento, 40, 'maior engajamento primeiro');
assert.strictEqual(top[1].engajamento, 20, 'sem medição fica por último');

// Destaques: frases dos números, na ordem certa, sem inventar
const d = I.destaques({
  totais: { alcance: 250, engajamento: 60 },
  anteriores: { alcance: 200, engajamento: 60 },
  publicacoes: [
    { tipo: 'reel', engajamento: 40 }, { tipo: 'reel', engajamento: 20 },
    { tipo: 'post', engajamento: 5 }, { tipo: 'post', engajamento: 7 }
  ],
  horarios: { suficiente: true, top: [{ dia: 'Qua', hora: 19, media: 33.5 }] },
  saldoSeguidores: 12,
  dias: 30
});
assert.strictEqual(d[0].titulo, 'Alcance');
assert.ok(d[0].texto.startsWith('+25%'), 'alcance: +25% contra o anterior');
assert.ok(!d.some((x) => x.titulo === 'Engajamento') || d.length === 4, 'engajamento igual: neutro, e pode ficar de fora pelo limite');
assert.ok(d.some((x) => x.titulo === 'Formato que mais rende' && x.texto.startsWith('Reels')), 'reels lideram');
assert.ok(d.some((x) => x.titulo === 'Melhor horário' && x.texto.startsWith('Qua às 19h')));
assert.ok(d.length <= 4, 'no máximo 4 destaques');

// Sem dado: um destaque neutro, sem números inventados
const vazio = I.destaques({});
assert.strictEqual(vazio.length, 1);
assert.strictEqual(vazio[0].tom, 'neutro');

// Datas: dia/mês e data-hora de Brasília
assert.strictEqual(I.diaCurto('2026-11-21'), '21/11');
assert.strictEqual(I.diaCurto(null), 'n/d');
assert.strictEqual(I.dataHora('2026-11-21T11:00:00Z'), '21/11 08:00', '11h UTC = 08h de Brasília');
assert.strictEqual(I.dataHora(null), 'n/d');

console.log('ok (analise-insights)');
