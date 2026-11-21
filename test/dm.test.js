// Fase 2 (DMs): respostas a quem escreveu nas últimas 24 horas. Sem rede: Meta, OpenAI e banco são falsos.
const assert = require('assert');
const crypto = require('crypto');
const dm = require('../lib/dm');
const respostas = require('../lib/respostas');
const { cifrarToken } = require('../lib/token-vault');

const AGORA = Date.parse('2026-11-21T12:00:00Z');
const HORA = 3600 * 1000;
const CHAVE = crypto.randomBytes(32).toString('base64');
const CONTA = '11111111-1111-4111-8111-111111111111';
const EXTERNO = '17841400000000001';
const CFG = { url: 'https://banco.exemplo', service: 's' };
const TOKEN = cifrarToken('tok-da-conta', CONTA, CHAVE);
const ISO = (h) => new Date(AGORA - h * HORA).toISOString();

// ── janela de 24 horas e texto ────────────────────────────────────────────────
assert.ok(dm.janelaAberta(ISO(23), AGORA), '23 horas: janela aberta');
assert.ok(!dm.janelaAberta(ISO(25), AGORA), '25 horas: janela fechada');
assert.ok(!dm.janelaAberta('nao-e-data', AGORA), 'data inválida: fechada');
assert.ok(dm.dmEnvioLigado({ DM_ENVIO: 'ligado' }) && !dm.dmEnvioLigado({}), 'envio de DM fica desligado por padrão');

// Fake: responde a OpenAI, a Meta (conversas, mensagens e envio) e o banco. Guarda cada chamada.
function criarFake(estado) {
  const chamadas = [];
  const f = async (url, opts = {}) => {
    const metodo = opts.method || 'GET';
    const corpo = opts.body ? JSON.parse(opts.body) : undefined;
    chamadas.push({ url, metodo, corpo, cabecalhos: opts.headers || {} });
    const json = (obj, status = 200) => ({ ok: status < 400, status, text: async () => (obj === null ? '' : JSON.stringify(obj)), json: async () => obj });
    if (url.includes('api.openai.com')) {
      return json({ choices: [{ message: { content: JSON.stringify({ texto: 'Obrigado, Ana!', notas: [] }) } }] });
    }
    if (url.includes('graph.instagram.com')) {
      if (metodo === 'POST' && url.includes('/messages')) return json({ recipient_id: 'x', message_id: 'y' }, estado.envioFalha ? 400 : 200);
      if (url.includes('/conversations?')) return json({ data: estado.conversas });
      if (url.includes('fields=messages')) {
        const conv = decodeURIComponent(url.split('/v27.0/')[1].split('?')[0]);
        return json({ messages: { data: estado.mensagens[conv] || [] } });
      }
      if (url.includes('fields=id%2Ccreated_time')) {
        const msg = decodeURIComponent(url.split('/v27.0/')[1].split('?')[0]);
        return json(estado.detalhes[msg]);
      }
    }
    if (url.includes('/rest/v1/')) {
      const caminho = decodeURIComponent(url.split('/rest/v1/')[1]);
      if (metodo === 'GET') {
        if (caminho.startsWith('social_accounts')) return json(estado.contas);
        if (caminho.startsWith('social_tokens')) return json(estado.tokens);
        if (caminho.startsWith('dm_respostas')) return json(estado.fila);
      }
      return json(null);
    }
    return json({});
  };
  return { f, chamadas };
}

const base = () => ({
  contas: [{ id: CONTA, username: 'academia', external_id: EXTERNO, parent_external_id: null }],
  tokens: [{ access_token_encrypted: TOKEN, token_expires_at: null }],
  conversas: [{ id: 'conv1' }, { id: 'conv2' }, { id: 'conv3' }],
  mensagens: {
    conv1: [{ id: 'm-new', created_time: ISO(2) }],
    conv2: [{ id: 'm-nossa', created_time: ISO(1) }],
    conv3: [{ id: 'm-velha', created_time: ISO(30) }]
  },
  detalhes: {
    'm-new': { id: 'm-new', created_time: ISO(2), from: { id: '5555', username: 'ana' }, to: {}, message: 'Obrigado, amei!' },
    'm-nossa': { id: 'm-nossa', created_time: ISO(1), from: { id: EXTERNO, username: 'academia' }, to: {}, message: 'Obrigado!' },
    'm-velha': { id: 'm-velha', created_time: ISO(30), from: { id: '6666' }, to: {}, message: 'Qual o preço?' }
  },
  fila: []
});
const env = { OPENAI_API_KEY: 'k', TOKEN_ENCRYPTION_KEY: CHAVE };

(async () => {
  // ── envio de texto: cabeçalho, corpo e limite de bytes ────────────────────────
  {
    const { f, chamadas } = criarFake(base());
    const conta = { id: CONTA, external_id: EXTERNO };
    await dm.enviarDM({ conta, token: 't', destinatarioId: '5555', texto: 'Oi, tudo bem?', f });
    const envio = chamadas.find((c) => c.metodo === 'POST');
    assert.ok(envio.url.startsWith(`https://graph.instagram.com/v27.0/${EXTERNO}/messages`), 'envia pelo IG_ID da conta');
    assert.strictEqual(envio.cabecalhos.Authorization, 'Bearer t', 'token no cabeçalho, como na documentação');
    assert.deepStrictEqual(envio.corpo, { recipient: { id: '5555' }, message: { text: 'Oi, tudo bem?' } });
    const { f: f2, chamadas: c2 } = criarFake(base());
    await assert.rejects(() => dm.enviarDM({ conta, token: 't', destinatarioId: '5555', texto: 'a'.repeat(1001), f: f2 }),
      (e) => e.status === 400, 'texto acima de 1000 bytes é recusado');
    assert.strictEqual(c2.length, 0, 'nada é enviado quando passa do limite');
  }

  // ── sincronizar com o envio desligado: só a fila ─────────────────────────────
  {
    const estado = base();
    const { f, chamadas } = criarFake(estado);
    const r = await dm.sincronizarDMs({ orgId: 'org-1', cfg: CFG, f, chave: CHAVE, env, agora: AGORA });
    assert.strictEqual(r.novos, 1, 'só a mensagem recebida nas últimas 24 horas entra');
    assert.strictEqual(r.enviados, 0);
    assert.ok(!chamadas.some((c) => c.metodo === 'POST' && c.url.includes('/messages')), 'nada é enviado sem DM_ENVIO');
    const gravado = chamadas.find((c) => c.metodo === 'POST' && c.url.includes('dm_respostas'));
    assert.strictEqual(gravado.corpo.mensagem_external_id, 'm-new');
    assert.strictEqual(gravado.corpo.categoria, 'agradecimento');
    assert.strictEqual(gravado.corpo.status, 'pendente');
    assert.strictEqual(gravado.corpo.remetente_id, '5555');
    assert.ok(gravado.url.includes('on_conflict=social_account_id,mensagem_external_id'), 'repetida não duplica');
  }

  // ── sincronizar com DM_ENVIO ligado: só agradecimento sai sozinho ─────────────
  {
    const estado = base();
    estado.detalhes['m-new'].message = 'Obrigado, amei!';
    const { f, chamadas } = criarFake(estado);
    const r = await dm.sincronizarDMs({ orgId: 'org-1', cfg: CFG, f, chave: CHAVE, env: { ...env, DM_ENVIO: 'ligado' }, agora: AGORA });
    assert.strictEqual(r.enviados, 1, 'agradecimento sai sozinho');
    const envio = chamadas.find((c) => c.metodo === 'POST' && c.url.includes('/messages'));
    assert.strictEqual(envio.corpo.recipient.id, '5555', 'responde a quem escreveu');
    const gravado = chamadas.find((c) => c.metodo === 'POST' && c.url.includes('dm_respostas'));
    assert.strictEqual(gravado.corpo.status, 'enviada');
  }

  // ── sincronizar: pergunta não sai sozinha, mesmo com DM_ENVIO ligado ─────────
  {
    const estado = base();
    estado.detalhes['m-new'].message = 'Qual o preço do plano?';
    const { f, chamadas } = criarFake(estado);
    const r = await dm.sincronizarDMs({ orgId: 'org-1', cfg: CFG, f, chave: CHAVE, env: { ...env, DM_ENVIO: 'ligado' }, agora: AGORA });
    assert.strictEqual(r.enviados, 0, 'pergunta fica para aprovação');
    assert.ok(!chamadas.some((c) => c.metodo === 'POST' && c.url.includes('/messages')));
  }

  // ── conta de página do Facebook fica de fora, com aviso ───────────────────────
  {
    const estado = base();
    estado.contas[0].parent_external_id = '123';
    const { f, chamadas } = criarFake(estado);
    const r = await dm.sincronizarDMs({ orgId: 'org-1', cfg: CFG, f, chave: CHAVE, env, agora: AGORA });
    assert.strictEqual(r.novos, 0);
    assert.ok(r.avisos.some((a) => /não para páginas do Facebook/.test(a)));
    assert.ok(!chamadas.some((c) => c.url.includes('/conversations')), 'nem busca conversas');
  }

  // ── ações: enviar é bloqueado sem DM_ENVIO e fora da janela ──────────────────
  const linha = (h) => ({
    id: 'dm-1', social_account_id: CONTA, remetente_id: '5555', recebida_em: ISO(h), status: 'pendente', rascunho: 'Obrigado!'
  });
  {
    const estado = { ...base(), fila: [linha(2)] };
    const { f, chamadas } = criarFake(estado);
    await assert.rejects(() => dm.acaoDM({ orgId: 'org-1', id: 'dm-1', acao: 'enviar', cfg: CFG, f, chave: CHAVE, env, agora: AGORA }),
      (e) => e.status === 409 && /liberado/.test(e.message), 'enviar sem DM_ENVIO é recusado');
    assert.ok(!chamadas.some((c) => c.url.includes('/messages')));
  }
  {
    const estado = { ...base(), fila: [linha(30)] };
    const { f, chamadas } = criarFake(estado);
    await assert.rejects(() => dm.acaoDM({ orgId: 'org-1', id: 'dm-1', acao: 'enviar', cfg: CFG, f, chave: CHAVE, env: { ...env, DM_ENVIO: 'ligado' }, agora: AGORA }),
      (e) => e.status === 409 && /24 horas/.test(e.message), 'fora da janela não envia');
    assert.ok(!chamadas.some((c) => c.url.includes('/messages')));
  }
  {
    const estado = { ...base(), fila: [linha(2)] };
    const { f, chamadas } = criarFake(estado);
    const r = await dm.acaoDM({ orgId: 'org-1', id: 'dm-1', acao: 'enviar', cfg: CFG, f, chave: CHAVE, env: { ...env, DM_ENVIO: 'ligado' }, agora: AGORA });
    assert.strictEqual(r.status, 'enviada');
    assert.ok(chamadas.some((c) => c.metodo === 'POST' && c.url.includes('/messages')), 'envia quando a janela está aberta e o envio ligado');
  }
  {
    const estado = { ...base(), fila: [linha(2)] };
    const { f } = criarFake(estado);
    const r = await dm.acaoDM({ orgId: 'org-1', id: 'dm-1', acao: 'aprovar', cfg: CFG, f, chave: CHAVE, env, agora: AGORA });
    assert.strictEqual(r.status, 'aprovada');
  }

  console.log('ok (dm)');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
