// Programação de postagens que se repetem: feriados, datas e ordem das opções. Sem rede e sem navegador.
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

// ── Ordem das opções: 1 = sempre a mesma; 2 = alterna; 3 = ciclo 1-2-3 ─────────
{
  const um = [{ id: 'a' }];
  const dois = [{ id: 'a' }, { id: 'b' }];
  const tres = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  assert.deepStrictEqual([0, 1, 2, 3].map((i) => P.escolherPelaOrdem(um, i).id), ['a', 'a', 'a', 'a'], 'uma opção: sempre a mesma');
  assert.deepStrictEqual([0, 1, 2, 3].map((i) => P.escolherPelaOrdem(dois, i).id), ['a', 'b', 'a', 'b'], 'duas opções: alterna');
  assert.deepStrictEqual([0, 1, 2, 3, 4, 5, 6].map((i) => P.escolherPelaOrdem(tres, i).id), ['a', 'b', 'c', 'a', 'b', 'c', 'a'], 'três opções: ciclo');
  assert.strictEqual(P.escolherPelaOrdem([], 0), null, 'sem opções, nada');
}

// ── Planejamento de uma regra de segunda-feira ───────────────────────────────
const base = {
  id: 'promo', nome: 'Promoção', empresa: 'academia', dias: [1], hora: '09:00', formato: 'Post',
  pularFeriados: true, ativa: true, gerados: {}, proximo: 0
};
const tresOpcoes = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

{
  // Janela de 22/11 a 12/12: segundas 23/11, 30/11 e 07/12
  const { regra: r1, novos } = P.planejarRegra(Object.assign({}, base, { variantes: tresOpcoes }), '2026-11-22', 21, []);
  assert.deepStrictEqual(novos.map((n) => n.data), ['2026-11-23', '2026-11-30', '2026-12-07'], 'uma postagem por segunda');
  assert.deepStrictEqual(novos.map((n) => n.variante.id), ['a', 'b', 'c'], 'semana a semana, na ordem das opções');
  assert.ok(novos.every((n) => n.cardId.startsWith('ac_prog_promo_')), 'ID do card traz o prefixo da empresa');
  assert.strictEqual(novos[0].cardId, 'ac_prog_promo_20261123');
  assert.strictEqual(r1.proximo, 3, 'o contador avança a cada postagem criada');

  // Gerar de novo não duplica
  const { novos: outra } = P.planejarRegra(r1, '2026-11-22', 21, []);
  assert.strictEqual(outra.length, 0, 'datas já geradas não se repetem');
}
{
  // Uma opção: a mesma em todas as semanas
  const { novos } = P.planejarRegra(Object.assign({}, base, { variantes: [{ id: 'unica' }] }), '2026-11-22', 21, []);
  assert.deepStrictEqual(novos.map((n) => n.variante.id), ['unica', 'unica', 'unica']);
}
{
  // Duas opções em quatro semanas: alterna
  const { novos } = P.planejarRegra(Object.assign({}, base, { variantes: [{ id: 'a' }, { id: 'b' }] }), '2026-11-22', 28, []);
  assert.deepStrictEqual(novos.map((n) => n.variante.id), ['a', 'b', 'a', 'b']);
}
{
  // Três opções em seis semanas: ciclo 1-2-3
  const { novos } = P.planejarRegra(Object.assign({}, base, { variantes: tresOpcoes }), '2026-11-22', 42, []);
  assert.deepStrictEqual(novos.map((n) => n.variante.id), ['a', 'b', 'c', 'a', 'b', 'c']);
}
{
  // A ordem continua de uma geração para a outra (uma semana por vez)
  let regra = Object.assign({}, base, { variantes: tresOpcoes });
  const ids = [];
  const datas = [['2026-11-22', 'semana 1'], ['2026-11-24', 'semana 2'], ['2026-11-30', 'semana 3'], ['2026-12-05', 'semana 4'], ['2026-12-12', 'semana 5']];
  for (const [hoje] of datas) {
    const { regra: nova, novos } = P.planejarRegra(regra, hoje, 7, []);
    regra = nova;
    novos.forEach((n) => ids.push(n.variante.id));
  }
  assert.deepStrictEqual(ids, ['a', 'b', 'c', 'a'], 'gerações separadas mantêm a sequência');
}
{
  // Feriado pulado: a semana fica sem post, e a sequência segue na semana seguinte
  const { novos } = P.planejarRegra(Object.assign({}, base, { variantes: tresOpcoes }), '2026-11-22', 42, ['2026-11-30']);
  assert.deepStrictEqual(novos.map((n) => n.data), ['2026-11-23', '2026-12-07', '2026-12-14', '2026-12-21', '2026-12-28'], 'pula o dia marcado');
  assert.deepStrictEqual(novos.map((n) => n.variante.id), ['a', 'b', 'c', 'a', 'b'], 'a sequência não é quebrada pelo feriado');
}
{
  // Sem a opção de pular feriados, o dia entra
  const semPular = Object.assign({}, base, { variantes: tresOpcoes, pularFeriados: false });
  const { novos } = P.planejarRegra(semPular, '2026-11-22', 21, ['2026-11-30']);
  assert.strictEqual(novos.length, 3, 'com "pular feriados" desligado, o dia entra');
}
{
  // Regra desligada ou sem empresa válida não gera nada
  assert.strictEqual(P.planejarRegra(Object.assign({}, base, { variantes: tresOpcoes, ativa: false }), '2026-11-22', 21, []).novos.length, 0);
  assert.strictEqual(P.planejarRegra(Object.assign({}, base, { variantes: tresOpcoes, empresa: 'outra' }), '2026-11-22', 21, []).novos.length, 0);
}

// ── Horário de Brasília (agendamento na Zernio) ──
{
  assert.strictEqual(P.dataHoraMs('2026-11-23', '10h00'), Date.parse('2026-11-23T13:00:00Z'), '10h00 de Brasília é 13h UTC');
  assert.strictEqual(P.dataHoraMs('2026-11-23', '09:30'), Date.parse('2026-11-23T12:30:00Z'), 'aceita 09:30');
  assert.ok(Number.isNaN(P.dataHoraMs('2026-11-23', 'xx')), 'hora inválida não agenda');
}

// ── Data de início: a regra não gera datas antes dela ─────────────────────────
{
  const sem = P.planejarRegra(Object.assign({}, base, { variantes: tresOpcoes }), '2026-11-22', 21, []);
  assert.deepStrictEqual(sem.novos.map((n) => n.data), ['2026-11-23', '2026-11-30', '2026-12-07'], 'sem data de início, começa hoje');
  const com = P.planejarRegra(Object.assign({}, base, { variantes: tresOpcoes, inicio: '2026-11-30' }), '2026-11-22', 21, []);
  assert.deepStrictEqual(com.novos.map((n) => n.data), ['2026-11-30', '2026-12-07'], 'com início em 30/11, a 23/11 não entra');
}

// ── Opção fixada em um dia da semana ───────────────────────────────────────────
{
  // Opção 'm' fixada na segunda; 'u1' e 'u2' sem fixar, alternando nas quartas
  const r = Object.assign({}, base, {
    dias: [1, 3], variantes: [{ id: 'm', dia: 1 }, { id: 'u1', dia: null }, { id: 'u2' }]
  });
  const { novos } = P.planejarRegra(r, '2026-11-22', 21, []);
  assert.deepStrictEqual(novos.map((n) => n.variante.id), ['m', 'u1', 'm', 'u2', 'm', 'u1'],
    'segundas sempre com a fixada; quartas alternam entre as livres');
}
{
  // Duas opções fixadas no mesmo dia: alternam entre elas
  const { novos } = P.planejarRegra(Object.assign({}, base, { dias: [1], variantes: [{ id: 'a', dia: 1 }, { id: 'b', dia: 1 }] }), '2026-11-22', 28, []);
  assert.deepStrictEqual(novos.map((n) => n.variante.id), ['a', 'b', 'a', 'b']);
}
{
  // Opção fixada em um dia que não está marcado nos dias da semana nunca entra
  const { novos } = P.planejarRegra(Object.assign({}, base, { dias: [1], variantes: [{ id: 'x', dia: 5 }] }), '2026-11-22', 21, []);
  assert.strictEqual(novos.length, 0, 'opção fixada em dia não marcado não gera post');
}

console.log('programacao: ok');
