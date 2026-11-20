// Análise das Redes Sociais: ponto de entrada das ações (uma só função, por causa do limite
// de funções do plano Hobby da Vercel). Uso: /api/analise?acao=<ação>
//   meta-iniciar   POST  URL de login da Meta (admin+)
//   meta-callback  GET   retorno da Meta (chamado pela Meta)
//   contas         GET   contas conectadas da organização (viewer+)

const analise = require('../lib/analise-api');

module.exports = async (req, res) => {
  const acao = String((req.query && req.query.acao) || '');
  const handler = Object.prototype.hasOwnProperty.call(analise.HANDLERS, acao) ? analise.HANDLERS[acao] : null;
  if (!handler) {
    res.status(404).json({ error: 'Ação desconhecida: ' + acao });
    return;
  }
  let deps;
  try {
    deps = analise.dependenciasPadrao(process.env);
  } catch (e) {
    res.status(500).json({ error: e.message });
    return;
  }
  return handler(req, res, deps);
};
