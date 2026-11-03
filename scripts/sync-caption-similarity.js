// Copia lib/caption-similarity.js para dentro do index.html (o painel é um arquivo estático,
// sem build, então não consegue dar require). Rode depois de mexer na lib:
//   node scripts/sync-caption-similarity.js
// O teste test/caption-similarity.test.js falha se as duas versões estiverem diferentes.
const fs = require('fs');
const path = require('path');

const BEGIN = '// <caption-similarity:begin> (gerado de lib/caption-similarity.js por scripts/sync-caption-similarity.js — não edite aqui)';
const END = '// <caption-similarity:end>';

function generate(libSource) {
  const body = libSource
    .replace(/^\/\/.*\n/gm, (m) => m) // mantém comentários
    .replace(/module\.exports\s*=\s*\{[^}]*\};?\s*$/m, '')
    .trim();
  return BEGIN + '\nconst CapSim = (function () {\n' +
    body.split('\n').map((l) => (l ? '  ' + l : l)).join('\n') +
    '\n  return { createIndex, similar, similarToDraft };\n})();\n' + END;
}

function sync(htmlPath, libPath, check) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const a = html.indexOf(BEGIN);
  const b = html.indexOf(END);
  if (a < 0 || b < 0 || b < a) throw new Error('marcadores caption-similarity não encontrados em ' + htmlPath);
  const next = html.slice(0, a) + generate(fs.readFileSync(libPath, 'utf8')) + html.slice(b + END.length);
  if (check) return next === html;
  fs.writeFileSync(htmlPath, next);
  return true;
}

module.exports = { generate, sync, BEGIN, END };

if (require.main === module) {
  const root = path.join(__dirname, '..');
  sync(path.join(root, 'index.html'), path.join(root, 'lib', 'caption-similarity.js'), false);
  console.log('index.html sincronizado com lib/caption-similarity.js');
}
