// Fórmulas de gancho do ig-reel: identificação por expressão regular, sem rede.
const assert = require('assert');
const H = require('../lib/hook-formulas');

assert.strictEqual(H.FORMULAS.length, 26);
assert.strictEqual(H.identificarFormula(''), null);
assert.strictEqual(H.identificarFormula(null), null);
assert.strictEqual(H.identificarFormula('Bom dia, tudo bem com vocês?'), null);

// Padrões em inglês (da skill)
const custo = H.identificarFormula('$18,000 is what one missing clause cost me.');
assert.ok(custo, 'deveria identificar alguma fórmula');
assert.strictEqual(typeof custo.nome, 'string');
assert.deepStrictEqual(H.identificarFormula('$18,000 is what one missing clause cost me.'), custo);

// Padrões em português (dos posts da conta)
assert.deepStrictEqual(H.identificarFormula('R$ 500 é o que um erro me custou'), { id: 1, nome: 'Cost Confession' });
assert.deepStrictEqual(H.identificarFormula('Ninguém te conta isso sobre academia.'), { id: 3, nome: 'Nobody Tells You' });
assert.deepStrictEqual(H.identificarFormula('Por que você ainda posta sem estratégia?'), { id: 16, nome: 'The Verbatim Question' });
// Palavras que terminam com acento precisam casar (o \b do JavaScript não reconhece acento)
assert.deepStrictEqual(H.identificarFormula('Se você treina 3x por semana, leia isso'), { id: 10, nome: 'If This, Then Watch' });
console.log('hook-formulas: ok');
