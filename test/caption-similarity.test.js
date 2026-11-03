// node test/caption-similarity.test.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const lib = require('../lib/caption-similarity');
const { sync } = require('../scripts/sync-caption-similarity');

const root = path.join(__dirname, '..');
const htmlPath = path.join(root, 'index.html');
let passed = 0;
function t(nome, fn) {
  try { fn(); passed++; console.log('  ok   ' + nome); }
  catch (e) { console.log('  FALHA ' + nome + '\n        ' + e.message); process.exitCode = 1; }
}

// Textos reais gerados pelo Modo Automático em 03–05/11/2026.
const D = (id, profile, date, time, title, texto) => ({ id, profile, date, time, title, texto });
const docs = [
  D('a', 'sorveteria', '2026-11-04', '09h00', 'Produto da Loja — Picolé de Uva', 'Um clássico que nunca sai de moda: picolé de uva! Geladinho, docinho e perfeito pra refrescar a manhã. Qual é o seu sabor favorito de picolé?'),
  D('b', 'sorveteria', '2026-11-05', '09h00', 'Produto do Dia — Picolé de Uva', 'Começando o dia com sabor de infância! Nossa dica para hoje: picolé de uva bem geladinho e super cremoso. Perfeito pra refrescar a manhã em Turvo.'),
  D('c', 'sorveteria', '2026-11-04', '15h30', 'Carrinho de Sorvete para Eventos', 'Sua festa pode ficar ainda mais divertida com o carrinho de sorvete da Guri! Prático, alegre e delicioso para aniversários e eventos.'),
  D('d', 'sorveteria', '2026-11-05', '15h30', 'Carrinho de Sorvete para Festas', 'Já imaginou a alegria da criançada com nosso carrinho de sorvete na sua festa? Diversão garantida, sabores variados e aquele toque especial.'),
  D('e', 'sorveteria', '2026-11-12', '15h30', 'Carrinho de Sorvete para Festas', 'Festa de aniversário pede sorvete! Chame o carrinho do Guri e deixe a criançada feliz com muitos sabores para escolher.'),
  D('f', 'sorveteria', '2026-11-04', '19h00', 'Encerramento do Dia — Agradecimento', 'Mais um dia delicioso, Turvo! Obrigado por escolher a Sorvetes Guri pra adoçar a sua quarta-feira. Amanhã tem mais sabor te esperando.'),
  D('g', 'sorveteria', '2026-11-05', '19h00', 'Encerramento do Dia — Obrigado, Turvo!', 'Mais um dia delicioso por aqui! Obrigado a todos que passaram, sorriram e se refrescaram com a gente hoje. Amanhã tem mais sabor te esperando.'),
  D('h', 'academia', '2026-11-04', '07h00', 'Aproveite a manhã para cuidar da mente', 'Que tal começar o dia respirando fundo e se movimentando? Treinar também cuida da cabeça. Venha para a Planeta Corpo.'),
  D('i', 'academia', '2026-11-05', '07h00', 'Picolé de uva na academia?', 'Um clássico que nunca sai de moda: picolé de uva! Geladinho, docinho e perfeito pra refrescar a manhã. Qual é o seu sabor favorito?')
];
const ix = lib.createIndex(docs);
const ids = (id) => lib.similar(ix, id).map((r) => r.doc.id + ':' + r.why);

// Com só 9 textos de exemplo o IDF é fraco: o par sai como 'caption' (histórico real, ~1000 cards) ou 'tema' (título).
t('mesmo produto em dias seguidos é apontado', () => assert.ok(['a:caption', 'a:tema'].includes(ids('b')[0]), 'veio ' + ids('b')));
t('carrinho duas vezes na mesma semana é apontado (regra semanal), nos dois sentidos', () => {
  assert.ok(ids('c').includes('d:semanal')); assert.ok(ids('d').includes('c:semanal'));
});
t('carrinho em outra semana NÃO dispara a regra semanal', () => assert.ok(!ids('e').some((x) => x.endsWith(':semanal') && (x.startsWith('c') || x.startsWith('d')))));
t('encerramento do dia (template fixo) não é apontado contra outro encerramento', () => assert.deepStrictEqual(ids('f'), []));
t('marcas diferentes nunca são comparadas', () => assert.ok(!ids('i').includes('a:caption') && !ids('a').includes('i:caption')));
t('posts sem relação não são apontados', () => assert.deepStrictEqual(ids('h'), []));
t('fora da janela de 7 dias não é apontado', () => {
  const far = lib.createIndex([docs[0], D('z', 'sorveteria', '2026-11-20', '09h00', docs[0].title, docs[0].texto)]);
  assert.deepStrictEqual(lib.similar(far, 'z'), []);
});
t('rascunho (post que a IA acabou de escrever) é comparado com o histórico', () => {
  const r = lib.similarToDraft(ix, { id: 'novo', profile: 'sorveteria', date: '2026-11-06', time: '09h00', title: 'Picolé de Uva', texto: 'Hoje tem picolé de uva geladinho e docinho, perfeito pra refrescar a manhã!' });
  assert.ok(r.some((x) => x.doc.id === 'b'));
});

// A cópia embutida no index.html tem que ser idêntica à lib.
t('index.html está sincronizado com lib/caption-similarity.js', () => assert.ok(sync(htmlPath, path.join(root, 'lib', 'caption-similarity.js'), true), 'rode: node scripts/sync-caption-similarity.js'));
t('versão do navegador dá exatamente o mesmo resultado da lib', () => {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const a = html.indexOf('const CapSim = (function'); const b = html.indexOf('// <caption-similarity:end>');
  const browser = vm.runInNewContext(html.slice(a, b) + '\nCapSim;', {});
  const ixb = browser.createIndex(docs);
  docs.forEach((d) => {
    const x = lib.similar(ix, d.id).map((r) => [r.doc.id, r.why, +r.score.toFixed(6)]);
    const y = browser.similar(ixb, d.id).map((r) => [r.doc.id, r.why, +r.score.toFixed(6)]);
    assert.deepStrictEqual(JSON.parse(JSON.stringify(y)), JSON.parse(JSON.stringify(x)), 'divergiu em ' + d.id); // JSON: o vm tem outro Array.prototype
  });
});

console.log(passed + ' ok' + (process.exitCode ? ' — HÁ FALHAS' : ''));
