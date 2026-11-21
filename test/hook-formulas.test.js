// Fórmulas de gancho do ig-reel: identificação por expressão regular, sem rede.
const assert = require('assert');
const H = require('../lib/hook-formulas');

assert.strictEqual(H.FORMULAS.length, 26);
assert.strictEqual(H.identificarFormula(''), null);
assert.strictEqual(H.identificarFormula(null), null);
assert.strictEqual(H.identificarFormula('Bom dia, tudo bem com vocês?'), null);

// Os padrões da skill são em inglês: um gancho em português não casa (limitação registrada).
const custo = H.identificarFormula('$18,000 is what one missing clause cost me.');
assert.ok(custo, 'deveria identificar alguma fórmula');
assert.strictEqual(typeof custo.nome, 'string');

// Ordem: a primeira fórmula da lista que casa vence, e o resultado é estável.
assert.deepStrictEqual(H.identificarFormula('$18,000 is what one missing clause cost me.'), custo);
assert.strictEqual(H.identificarFormula('R$ 500 é o que um erro me custou'), null);
console.log('hook-formulas: ok');
