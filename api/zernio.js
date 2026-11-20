// Zernio em uma única função serverless (o plano Hobby da Vercel aceita 12 por projeto).
// Uso: GET ou POST /api/zernio?acao=<ação>
//   health        GET   status das contas de Instagram na Zernio      (antes: /api/zernio-health)
//   post-status   POST  status real de um post já enviado             (antes: /api/zernio-post-status)
//   retry-post    POST  republica um post que a Zernio marcou como falho (antes: /api/zernio-retry-post)
//   cancel-post   POST  cancela um agendamento                        (antes: /api/zernio-cancel-post)
//   media-upload  POST  prepara mídia no storage da Zernio            (antes: /api/zernio-media-upload)
// Cada ação está em lib/zernio/ com o mesmo código que tinha no arquivo antigo.
// As URLs antigas continuam funcionando por reescrita (vercel.json).

const handlers = {
  'health': require('../lib/zernio/health'),
  'post-status': require('../lib/zernio/post-status'),
  'retry-post': require('../lib/zernio/retry-post'),
  'cancel-post': require('../lib/zernio/cancel-post'),
  'media-upload': require('../lib/zernio/media-upload')
};

module.exports = async (req, res) => {
  const acao = String((req.query && req.query.acao) || '');
  const handler = Object.prototype.hasOwnProperty.call(handlers, acao) ? handlers[acao] : null;
  if (!handler) {
    res.status(404).json({ error: 'Ação da Zernio desconhecida: ' + acao });
    return;
  }
  return handler(req, res);
};
