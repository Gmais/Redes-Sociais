// Respostas a comentários (Fase 2). Sem rede: o banco e a Meta são uma função falsa.
const assert = require('assert');
const crypto = require('crypto');
const respostas = require('../lib/respostas');
const { cifrarToken } = require('../lib/token-vault');
const escrita = require('../lib/escrita');

const CHAVE = crypto.randomBytes(32).toString('base64');
const AGORA = Date.parse('2026-11-21T12:00:00Z');
const CONTA = '11111111-1111-4111-8111-111111111111';
const CFG = { url: 'https://banco.exemplo', service: 'chave-servico' };

// Função falsa: responde o banco (por caminho), a Meta e a OpenAI, e guarda cada chamada.
function criarFake(estado) {
  const chamadas = [];
  const f = async (url, opts = {}) => {
    const metodo = opts.method || 'GET';
    const corpo = opts.body ? JSON.parse(opts.body) : undefined;
    chamadas.push({ url, metodo, corpo });
    const json = (obj, status = 200) => ({ ok: status < 400, status, text: async () => (obj === null ? '' : JSON.stringify(obj)), json: async () => obj });
    if (url.includes('api.openai.com')) {
      return json({ choices: [{ message: { content: JSON.stringify({ texto: 'Obrigado, Ana!', notas: [] }) } }] });
    }
    if (url.includes('graph.instagram.com')) {
      if (url.includes('/replies')) return json({ id: 'resposta-1' });
      if (url.includes('/comments')) return estado.metaComentarios ? json({ data: estado.comentarios }) : json({ error: { message: 'token inválido' } }, 400);
    }
    if (url.includes('/rest/v1/')) {
      const caminho = decodeURIComponent(url.split('/rest/v1/')[1]);
      if (metodo === 'GET') {
        if (caminho.startsWith('social_accounts')) return json(estado.contas);
        if (caminho.startsWith('social_tokens')) return json(estado.tokens);
        if (caminho.startsWith('social_posts')) return json(estado.posts);
        if (caminho.startsWith('comentarios_respostas')) return json(estado.fila);
      }
      return json(null);
    }
    return json({});
  };
  return { f, chamadas };
}

const tokenCifrado = cifrarToken('token-da-conta', CONTA, CHAVE);
const contaBase = { id: CONTA, username: 'academia', external_id: '999', parent_external_id: null };

// ── classificar e regras de envio ─────────────────────────────────────────────
assert.strictEqual(respostas.classificar('👏👏🔥'), 'emoji');
assert.strictEqual(respostas.classificar('Obrigado, amei!'), 'agradecimento');
assert.strictEqual(respostas.classificar('Qual o preço do plano?'), 'pergunta');
assert.strictEqual(respostas.classificar('Péssimo atendimento, nunca mais'), 'reclamacao');
assert.strictEqual(respostas.classificar('Vou treinar amanhã cedo'), 'outro');
assert.ok(respostas.ehSimples('agradecimento') && respostas.ehSimples('emoji'), 'agradecimento e emoji são simples');
assert.ok(!respostas.ehSimples('pergunta') && !respostas.ehSimples('reclamacao'), 'pergunta e reclamação não são simples');
assert.ok(respostas.envioLigado({ RESPOSTAS_ENVIO: 'ligado' }) && respostas.envioLigado({ RESPOSTAS_ENVIO: 'Ligado' }));
assert.ok(!respostas.envioLigado({}) && !respostas.envioLigado({ RESPOSTAS_ENVIO: 'sim' }), 'sem a variável, o envio fica desligado');
assert.ok(!respostas.rascunhoPronto('') && !respostas.rascunhoPronto('Obrigado, {{nome}}'), 'rascunho vazio ou com placeholder não sai');
assert.ok(respostas.rascunhoPronto('Obrigado!'));

// ── regras de texto da resposta (sem prometer nada) ───────────────────────────
assert.ok(escrita.REGRAS.resposta.includes('Nunca prometa preço'), 'a regra de resposta proíbe prometer preço');

(async () => {
  // ── buscarComentarios: ocultos ficam de fora ─────────────────────────────────
  {
    const { f, chamadas } = criarFake({ metaComentarios: true, comentarios: [{ id: 'a', text: 'Oi' }, { id: 'b', text: 'Oculto', hidden: true }] });
    const lista = await respostas.buscarComentarios({ conta: contaBase, token: 't', postExternalId: 'm1', f });
    assert.deepStrictEqual(lista.map((c) => c.id), ['a'], 'comentário oculto não entra');
    assert.ok(chamadas[0].url.startsWith('https://graph.instagram.com/v27.0/m1/comments?'), 'conta do Instagram usa o host graph.instagram.com');
  }

  // ── erro da Meta vira ErroResposta com a mensagem dela ───────────────────────
  {
    const { f } = criarFake({ metaComentarios: false });
    await assert.rejects(() => respostas.buscarComentarios({ conta: contaBase, token: 't', postExternalId: 'm1', f }),
      (e) => e instanceof respostas.ErroResposta && /token inválido/.test(e.message), 'erro da Meta chega com a mensagem');
  }

  // ── enviarResposta: método POST em /replies com a mensagem ───────────────────
  {
    const { f, chamadas } = criarFake({});
    await respostas.enviarResposta({ conta: contaBase, token: 't', commentId: 'c9', texto: 'Valeu!', f });
    assert.strictEqual(chamadas[0].metodo, 'POST');
    assert.ok(chamadas[0].url.includes('/c9/replies?') && chamadas[0].url.includes('message=Valeu'), 'resposta vai para o comentário certo');
  }

  // ── sincronizar: com o envio desligado, só fila e rascunho ───────────────────
  const comentarios = [
    { id: 'x1', text: 'Obrigado, amei!', username: 'ana', timestamp: '2026-11-21T11:00:00+0000' },
    { id: 'x2', text: 'Qual o preço do plano?', username: 'bia', timestamp: '2026-11-21T11:05:00+0000' },
    { id: 'x3', text: '🔥🔥', username: 'caio', timestamp: '2026-11-21T11:10:00+0000' }
  ];
  const base = () => ({
    contas: [{ id: CONTA, username: 'academia' }],
    tokens: [{ access_token_encrypted: tokenCifrado, token_expires_at: null }],
    posts: [{ id: 'post-1', external_id: 'm1' }],
    metaComentarios: true,
    comentarios,
    fila: []
  });
  const envBase = { OPENAI_API_KEY: 'k', TOKEN_ENCRYPTION_KEY: CHAVE };

  {
    const estado = base();
    const { f, chamadas } = criarFake(estado);
    const r = await respostas.sincronizarRespostas({ orgId: 'org-1', cfg: CFG, f, chave: CHAVE, env: envBase, agora: AGORA });
    assert.strictEqual(r.novos, 3, 'três comentários novos entram na fila');
    assert.strictEqual(r.rascunhos, 3, 'cada um recebe rascunho');
    assert.strictEqual(r.enviados, 0, 'com o envio desligado, nada é enviado');
    assert.ok(!chamadas.some((c) => c.url.includes('/replies')), 'nenhuma chamada de envio à Meta');
    const gravados = chamadas.filter((c) => c.metodo === 'POST' && c.url.includes('comentarios_respostas'));
    assert.deepStrictEqual(gravados.map((c) => c.corpo.categoria), ['agradecimento', 'pergunta', 'emoji']);
    assert.ok(gravados.every((c) => c.corpo.status === 'pendente'), 'todos ficam pendentes para aprovação');
    assert.ok(gravados[0].url.includes('on_conflict=social_account_id,comment_external_id'), 'repetido não duplica');
  }

  // ── sincronizar: com o envio ligado, só as simples saem sozinhas ─────────────
  {
    const estado = base();
    const { f, chamadas } = criarFake(estado);
    const env = { ...envBase, RESPOSTAS_ENVIO: 'ligado' };
    const r = await respostas.sincronizarRespostas({ orgId: 'org-1', cfg: CFG, f, chave: CHAVE, env, agora: AGORA });
    assert.strictEqual(r.enviados, 2, 'agradecimento e emoji saem sozinhos');
    const enviados = chamadas.filter((c) => c.url.includes('/replies'));
    assert.strictEqual(enviados.length, 2);
    const gravados = chamadas.filter((c) => c.metodo === 'POST' && c.url.includes('comentarios_respostas'));
    assert.deepStrictEqual(gravados.map((c) => c.corpo.status), ['enviada', 'pendente', 'enviada'], 'pergunta continua pendente');
  }

  // ── sincronizar: comentário já na fila não é de novo ─────────────────────────
  {
    const estado = base();
    estado.fila = [{ comment_external_id: 'x1' }, { comment_external_id: 'x2' }, { comment_external_id: 'x3' }];
    const { f } = criarFake(estado);
    const r = await respostas.sincronizarRespostas({ orgId: 'org-1', cfg: CFG, f, chave: CHAVE, env: envBase, agora: AGORA });
    assert.strictEqual(r.novos, 0, 'nada novo na fila');
  }

  // ── ações da fila ────────────────────────────────────────────────────────────
  const linhaPendente = {
    id: 'fila-1', organization_id: 'org-1', social_account_id: CONTA, status: 'pendente',
    comment_external_id: 'x2', rascunho: 'Mando os detalhes agora.'
  };
  const acao = (estado, parametros, env = envBase) => {
    const { f, chamadas } = criarFake(estado);
    return respostas.acaoResposta({ orgId: 'org-1', cfg: CFG, f, chave: CHAVE, env, agora: AGORA, ...parametros }).then(
      (r) => ({ r, chamadas }), (e) => ({ erro: e, chamadas }));
  };

  {
    const estado = { fila: [linhaPendente], contas: [{ id: CONTA, username: 'academia' }], tokens: [{ access_token_encrypted: tokenCifrado, token_expires_at: null }] };
    const { r, erro, chamadas } = await acao(estado, { id: 'fila-1', acao: 'enviar' }, envBase);
    assert.ok(erro && erro.status === 409 && /liberado/.test(erro.message), 'enviar com o envio desligado é recusado');
    assert.ok(!chamadas.some((c) => c.url.includes('/replies')), 'nada foi enviado à Meta');
  }

  {
    const estado = { fila: [linhaPendente], contas: [{ id: CONTA, username: 'academia' }], tokens: [{ access_token_encrypted: tokenCifrado, token_expires_at: null }] };
    const { r, chamadas } = await acao(estado, { id: 'fila-1', acao: 'enviar' }, { ...envBase, RESPOSTAS_ENVIO: 'ligado' });
    assert.strictEqual(r.status, 'enviada');
    assert.ok(chamadas.some((c) => c.url.includes('/x2/replies') && c.metodo === 'POST'), 'envia para o comentário certo');
  }

  {
    const { r, chamadas } = await acao({ fila: [linhaPendente] }, { id: 'fila-1', acao: 'aprovar' });
    assert.strictEqual(r.status, 'aprovada');
    assert.ok(chamadas.some((c) => c.metodo === 'PATCH' && c.corpo.status === 'aprovada'));
  }

  {
    const { r, chamadas } = await acao({ fila: [linhaPendente] }, { id: 'fila-1', acao: 'editar', texto: '  Mando os detalhes amanhã.  ' });
    assert.strictEqual(r.rascunho, 'Mando os detalhes amanhã.');
    assert.ok(chamadas.some((c) => c.metodo === 'PATCH' && c.corpo.rascunho === 'Mando os detalhes amanhã.'));
  }

  {
    const { erro } = await acao({ fila: [{ ...linhaPendente, status: 'enviada' }] }, { id: 'fila-1', acao: 'descartar' });
    assert.ok(erro && erro.status === 409, 'não descarta o que já foi enviado');
  }

  {
    const { erro } = await acao({ fila: [] }, { id: 'fila-404', acao: 'aprovar' });
    assert.ok(erro && erro.status === 404, 'comentário inexistente dá 404');
  }

  console.log('ok (respostas)');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
