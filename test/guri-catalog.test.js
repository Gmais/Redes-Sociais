// Testa a correspondência título do card -> produto do catálogo da Sorvetes Guri (sem rede).
// Nomes copiados do catálogo real em 16/11/2026 (abreviações da loja: Pic., Pt, Sorv., C/).
const assert = require('assert');
const { matchProduct } = require('../lib/guri-catalog');

const p = (nome, categoria = 'Loja') => ({ nome, categoria, menu: 'loja', imagem: 'https://x/' + nome });
const catalog = [
  p('Pic. Fruta Uva'), p('Pic. Fruta Limao'), p('Pic. Fruta Abacaxi C/ Hortela'), p('Pic. Leite Morango'),
  p('Guri Gurt'), p('Guri Gurt Morango'), p('Pt 1.5 L Guri + Leite Trufado'), p('Pt 2 L Sorv. Mousse Maracuja Trufado'),
  p('Taça Kinder Supremo', 'Taças'), p('Milkshake na taça – Ovomaltine', 'Milkshakes'),
  p('Baldone 3.2 L Sorv. Napolitano'), p('Cone Torta Alema'), p('Casquinha Lamorena')
];

const casos = [
  ['Produto da loja — Picolé de uva', 'Pic. Fruta Uva'],
  ['Produto da loja — picolé de limão', 'Pic. Fruta Limao'],
  ['Produto da loja — Picolé de abacaxi com hortelã', 'Pic. Fruta Abacaxi C/ Hortela'],
  ['Promoção: Guri Gurt por Apenas R$ 0,99', 'Guri Gurt'],
  ['Loja: Pote 400ml Guri + Leite Trufado', 'Pt 1.5 L Guri + Leite Trufado'],
  ['Milkshake de Ovomaltine na taça', 'Milkshake na taça – Ovomaltine'],
  ['Produto da loja — Baldone Napolitano', 'Baldone 3.2 L Sorv. Napolitano'],
  ['Produto da loja — Cone torta alemã', 'Cone Torta Alema'],
  ['Pic. Leite Morango', 'Pic. Leite Morango'],                 // nome exato gravado pelo Modo Automático
  // sem produto: pilares que não mostram item da loja, e "picolé" sozinho não identifica nada
  ['Produto do buffet — Sorvete sabor maracujá', null],
  ['Encerramento do dia — Segunda-feira', null],
  ['Humanização — Bruna', null],
  ['Carrinho de Sorvete para eventos', null],
  ['Produto da loja — Picolé', null]
];

let falhas = 0;
casos.forEach(([titulo, esperado]) => {
  const m = matchProduct(titulo, catalog);
  const got = m ? m.produto.nome : null;
  const ok = got === esperado;
  if (!ok) falhas++;
  console.log(`  ${ok ? 'ok  ' : 'FALHA'} ${titulo} -> ${got}${ok ? '' : ' (esperado: ' + esperado + ')'}`);
});
assert.strictEqual(falhas, 0, falhas + ' caso(s) falharam');
console.log(casos.length + ' ok (guri-catalog)');
