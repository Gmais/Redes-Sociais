// Programação de postagens que se repetem: feriados, datas e escolha de opção. Sem rede e sem navegador.
const assert = require('assert');
const P = require('../programacao.js');

// ── Páscoa e feriados móveis ─────────────────────────────────────────────────
assert.deepStrictEqual(P.pascoa(2026), { mes: 4, dia: 5 }, 'Páscoa de 2026 é 5 de abril');
assert.deepStrictEqual(P.pascoa(2025), { mes: 4, dia: 20 }, 'Páscoa de 2025 é 20 de abril');
assert.deepStrictEqual(P.pascoa(2024), { mes: 3, dia: 31 }, 'Páscoa de 2024 é 31 de março');

const f2026 = P.feriadosNacionais(2026);
assert.ok(f2026.some((f) => f.data === '2026-04-03' && f.nome === 'Sexta-feira Santa'), 'Sexta-feira Santa 2026');
assert.ok(f2026.some((f) => f.data === '2026-02-17'), 'Carnaval (terça) 2026 em 17 de fevereiro');
assert.ok(f2026.some((f) => f.data === '2026-06-04'), 'Corpus Christi 2026 em 4 de junho');
assert.ok(f2026.some((f) => f.data === '2026-11-02' && f.nome === 'Finados'), 'Finados é fixo');

assert.strictEqual(P.ehFeriado('2026-11-02', []), 'Finados');
assert.strictEqual(P.ehFeriado('2026-11-03', []), null, 'dia comum não é feriado');
assert.ok(P.ehFeriado('2026-11-03', ['2026-11-03']), 'dia extra informado pela pessoa conta como feriado');

// ── Datas ─────────────────────────────────────────────────────────────────────
assert.strictEqual(P.diaSemana('2026-11-23'), 1, '23 de novembro de 2026 é segunda-feira');
assert.strictEqual(P.diaSemana('2026-11-22'), 0, '22 de novembro de 2026 é domingo');
assert.deepStrictEqual(P.proximasDatas('2026-11-22', 3), ['2026-11-22', '2026-11-23', '2026-11-24']);
assert.strictEqual(P.deslocar('2026-12-31', 1), '2027-01-01', 'virada de ano');

// ── Escolha de opção: não repete em sequência e não sai duas vezes em curto prazo ──
{
  const variantes = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  let semente = 42;
  const rnd = () => { semente = (semente * 1103515245 + 12345) % 2147483648; return semente / 2147483648; };
  let recentes = [];
  let anterior = null;
  for (let i = 0; i < 30; i++) {
    const r = P.escolherVariante(variantes, recentes, rnd);
    assert.notStrictEqual(r.variante.id, anterior, 'nunca repete a opção da semana anterior');
    assert.ok(!recentes.slice(-1).includes(r.variante.id) || recentes.length === 0, 'não repete a última');
    anterior = r.variante.id;
    recentes = r.recentes;
  }
  // Com uma opção só, sempre a mesma (não quebra)
  const unica = P.escolherVariante([{ id: 'x' }], [], () => 0.9);
  assert.strictEqual(unica.variante.id, 'x');
  assert.deepStrictEqual(unica.recentes, []);
  // Sem opções, nada
  assert.strictEqual(P.escolherVariante([], [], Math.random).variante, null);
}

// ── Planejamento de uma regra de segunda-feira ───────────────────────────────
const regra = {
  id: 'promo', nome: 'Promoção', empresa: 'academia', dias: [1], hora: '09h00', formato: 'Post',
  pularFeriados: true, ativa: true, gerados: {}, recentes: [],
  variantes: [{ id: 'v1', titulo: 'A', texto: 'Texto A' }, { id: 'v2', titulo: 'B', texto: 'Texto B' }, { id: 'v3', titulo: 'C', texto: 'Texto C' }]
};
{
  // Janela de 22/11 a 12/12: segundas 23/11, 30/11 e 07/12
  const { regra: r1, novos } = P.planejarRegra(regra, '2026-11-22', 21, [], () => 0.5);
  assert.deepStrictEqual(novos.map((n) => n.data), ['2026-11-23', '2026-11-30', '2026-12-07'], 'uma postagem por segunda');
  assert.ok(novos.every((n) => n.cardId.startsWith('ac_prog_promo_')), 'ID do card traz o prefixo da empresa');
  assert.strictEqual(novos[0].cardId, 'ac_prog_promo_20261123');
  assert.deepStrictEqual(Object.keys(r1.gerados).sort(), ['2026-11-23', '2026-11-30', '2026-12-07']);

  // Gerar de novo não duplica
  const { novos: outra } = P.planejarRegra(r1, '2026-11-22', 21, [], () => 0.5);
  assert.strictEqual(outra.length, 0, 'datas já geradas não se repetem');
}
{
  // Feriado marcado pela pessoa: 30/11 sai da programação
  const { novos } = P.planejarRegra(regra, '2026-11-22', 21, ['2026-11-30'], () => 0.5);
  assert.deepStrictEqual(novos.map((n) => n.data), ['2026-11-23', '2026-12-07'], 'pula o feriado marcado');
}
{
  // Sem a opção de pular feriados, o dia entra
  const semPular = Object.assign({}, regra, { pularFeriados: false });
  const { novos } = P.planejarRegra(semPular, '2026-11-22', 21, ['2026-11-30'], () => 0.5);
  assert.strictEqual(novos.length, 3, 'com "pular feriados" desligado, o dia entra');
}
{
  // Regra desligada ou sem empresa válida não gera nada
  assert.strictEqual(P.planejarRegra(Object.assign({}, regra, { ativa: false }), '2026-11-22', 21, [], () => 0.5).novos.length, 0);
  assert.strictEqual(P.planejarRegra(Object.assign({}, regra, { empresa: 'outra' }), '2026-11-22', 21, [], () => 0.5).novos.length, 0);
}
{
  // A rotação passa pelas opções ao longo das semanas
  const { novos } = P.planejarRegra(Object.assign({}, regra, { gerados: {} }), '2026-11-22', 21, [], () => 0.0);
  const ids = novos.map((n) => n.variante.id);
  assert.strictEqual(new Set(ids).size, ids.length === 3 ? 3 : ids.length, 'semanas seguidas usam opções diferentes');
}

console.log('programacao: ok');
