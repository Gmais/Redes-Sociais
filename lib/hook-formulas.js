// Identifica a fórmula de gancho (26 fórmulas do ig-reel) da primeira fala de um Reel.
// Os padrões vêm de lib/hook-formulas.json: "match" (em inglês, cópia de .claude/skills/ig-reel/hooks.json)
// e "matchPt" (em português, para os posts da conta).
// Sem rede e sem IA: é só casamento de expressão regular, na ordem definida pela skill.
const dados = require('./hook-formulas.json');

const POR_ID = new Map(dados.formulas.map(f => [f.id, {
  ...f,
  re: new RegExp(f.match, 'i'),
  rePt: f.matchPt ? new RegExp(f.matchPt, 'i') : null
}]));

// Retorna { id, nome } da primeira fórmula que casa com o texto (em inglês ou em português), ou null.
function identificarFormula(texto) {
  if (typeof texto !== 'string' || !texto.trim()) return null;
  for (const id of dados.order) {
    const f = POR_ID.get(id);
    if (f && (f.re.test(texto) || (f.rePt && f.rePt.test(texto)))) return { id: f.id, nome: f.name };
  }
  return null;
}

module.exports = { identificarFormula, FORMULAS: dados.formulas.map(f => ({ id: f.id, nome: f.name })) };
