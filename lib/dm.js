'use strict';
// Respostas a mensagens diretas (DM), dentro da janela de 24 horas (Fase 2).
// Só responde quem escreveu para a conta. Sem prospecção e sem sequência de follow-ups.
// Ler, classificar e gerar rascunho funcionam já. O envio depende da permissão
// instagram_business_manage_messages (revisão da Meta) e da variável DM_ENVIO=ligado.
//
// Endpoints (documentação da Meta, Instagram API with Instagram Login, v27.0):
//   GET  /{IG_ID}/conversations?platform=instagram   -> lista de conversas (id, updated_time)
//   GET  /{CONVERSATION_ID}?fields=messages          -> IDs e created_time das mensagens
//   GET  /{MESSAGE_ID}?fields=id,created_time,from,to,message -> detalhes da mensagem
//   POST /{IG_ID}/messages  (Authorization: Bearer)   -> body {recipient:{id}, message:{text}}
// Janela: 24 horas depois da última mensagem recebida. Texto: até 1000 bytes.

const { rest } = require('./meta-oauth');
const respostas = require('./respostas');
const escrita = require('./escrita');

const { ErroResposta, lerJson, mensagemDaMeta, classificar, ehSimples, rascunhoPronto, contaComToken } = respostas;

const VERSAO = 'v27.0';
const HOST_IG = 'https://graph.instagram.com';
const JANELA_MS = 24 * 3600 * 1000;
const LIMITE_CONVERSAS = 10;
const LIMITE_RASCUNHOS_POR_RODADA = 5;
const TEXTO_MAX_BYTES = 1000;

// A janela de 24 horas conta a partir da última mensagem recebida.
function janelaAberta(recebidaEm, agora) {
  const t = Date.parse(recebidaEm);
  return Number.isFinite(t) && agora - t < JANELA_MS;
}

function dmEnvioLigado(env) {
  return String((env && env.DM_ENVIO) || '').toLowerCase() === 'ligado';
}

async function buscarConversas({ conta, token, f }) {
  const q = new URLSearchParams({ platform: 'instagram', access_token: token });
  const r = await f(`${HOST_IG}/${VERSAO}/${encodeURIComponent(conta.external_id)}/conversations?${q.toString()}`);
  const dados = await lerJson(r);
  if (!r.ok) throw new ErroResposta(mensagemDaMeta(dados), 502);
  return (dados.data || []).slice(0, LIMITE_CONVERSAS);
}

// Mensagem mais recente da conversa: lista os IDs e lê os detalhes da mais nova.
async function buscarUltimaMensagem({ conversaId, token, f }) {
  const q1 = new URLSearchParams({ fields: 'messages', access_token: token });
  const r1 = await f(`${HOST_IG}/${VERSAO}/${encodeURIComponent(conversaId)}?${q1.toString()}`);
  const d1 = await lerJson(r1);
  if (!r1.ok) throw new ErroResposta(mensagemDaMeta(d1), 502);
  const ids = ((d1.messages && d1.messages.data) || [])
    .slice()
    .sort((a, b) => Date.parse(b.created_time) - Date.parse(a.created_time));
  if (!ids.length) return null;
  const q2 = new URLSearchParams({ fields: 'id,created_time,from,to,message', access_token: token });
  const r2 = await f(`${HOST_IG}/${VERSAO}/${encodeURIComponent(ids[0].id)}?${q2.toString()}`);
  const d2 = await lerJson(r2);
  if (!r2.ok) throw new ErroResposta(mensagemDaMeta(d2), 502);
  return d2;
}

// Envia a resposta. O token vai no cabeçalho, como na documentação.
async function enviarDM({ conta, token, destinatarioId, texto, f }) {
  if (Buffer.byteLength(texto, 'utf8') > TEXTO_MAX_BYTES) throw new ErroResposta('A mensagem passa de 1000 bytes.', 400);
  const r = await f(`${HOST_IG}/${VERSAO}/${encodeURIComponent(conta.external_id)}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipient: { id: destinatarioId }, message: { text: texto } })
  });
  const dados = await lerJson(r);
  if (!r.ok) throw new ErroResposta(mensagemDaMeta(dados), 502);
  return dados;
}

// Lê as conversas, grava as mensagens recebidas dentro da janela e gera rascunho.
// Com DM_ENVIO ligado, só as simples (agradecimento e emoji) saem sozinhas.
async function sincronizarDMs({ orgId, cfg, f, chave, env, agora }) {
  const contas = await rest(cfg, f, 'GET',
    `social_accounts?select=id,username,external_id,parent_external_id&organization_id=eq.${encodeURIComponent(orgId)}&platform=eq.instagram&status=eq.active`) || [];
  const resumo = { contas: 0, novos: 0, rascunhos: 0, enviados: 0, avisos: [] };
  let rascunhosFeitos = 0;
  for (const linha of contas) {
    if (linha.parent_external_id) {
      resumo.avisos.push(`${linha.username}: DMs só para contas do Instagram, não para páginas do Facebook`);
      continue;
    }
    let conta;
    let token;
    try {
      ({ conta, token } = await contaComToken({ cfg, f, chave, contaId: linha.id, agora, orgId }));
    } catch (e) {
      resumo.avisos.push(`${linha.username}: ${e.message}`);
      continue;
    }
    resumo.contas += 1;
    const jaTem = new Set((await rest(cfg, f, 'GET',
      `dm_respostas?select=mensagem_external_id&social_account_id=eq.${encodeURIComponent(conta.id)}&limit=1000`) || [])
      .map((x) => String(x.mensagem_external_id)));
    let conversas;
    try {
      conversas = await buscarConversas({ conta, token, f });
    } catch (e) {
      resumo.avisos.push(`${conta.username}: ${e.message}`);
      continue;
    }
    for (const c of conversas) {
      let m;
      try {
        m = await buscarUltimaMensagem({ conversaId: c.id, token, f });
      } catch (e) {
        resumo.avisos.push(`${conta.username}: ${e.message}`);
        continue;
      }
      if (!m || !m.message || !m.from) continue;
      if (String(m.from.id) === String(conta.external_id)) continue; // a última é nossa: nada a responder
      if (!janelaAberta(m.created_time, agora)) continue;             // janela fechada: não responde
      const mid = String(m.id);
      if (jaTem.has(mid)) continue;
      jaTem.add(mid);
      const categoria = classificar(m.message);
      let rascunho = null;
      let erro = null;
      if (rascunhosFeitos < LIMITE_RASCUNHOS_POR_RODADA) {
        rascunhosFeitos += 1;
        try {
          rascunho = (await escrita.gerar({ tipo: 'dm', pedido: m.message, apiKey: env.OPENAI_API_KEY, env, f })).texto;
          resumo.rascunhos += 1;
        } catch (e) {
          erro = e.message;
        }
      }
      let status = 'pendente';
      let enviadaEm = null;
      if (rascunhoPronto(rascunho) && ehSimples(categoria) && dmEnvioLigado(env)) {
        try {
          await enviarDM({ conta, token, destinatarioId: String(m.from.id), texto: rascunho, f });
          status = 'enviada';
          enviadaEm = new Date(agora).toISOString();
          resumo.enviados += 1;
        } catch (e) {
          status = 'erro';
          erro = e.message;
        }
      }
      await rest(cfg, f, 'POST', 'dm_respostas?on_conflict=social_account_id,mensagem_external_id', {
        organization_id: orgId,
        social_account_id: conta.id,
        conversa_id: String(c.id),
        mensagem_external_id: mid,
        recebida_em: new Date(Date.parse(m.created_time)).toISOString(),
        remetente_id: String(m.from.id),
        remetente_nome: m.from.username || null,
        mensagem_texto: String(m.message).slice(0, 2000),
        categoria,
        rascunho,
        status,
        erro,
        enviada_em: enviadaEm
      }, { Prefer: 'return=minimal,resolution=ignore-duplicates' });
      resumo.novos += 1;
    }
  }
  return resumo;
}

// Fila da tela: pendentes, aprovadas e com erro, mais recentes primeiro.
async function listarDMs({ orgId, cfg, f }) {
  return await rest(cfg, f, 'GET',
    `dm_respostas?select=id,social_account_id,conversa_id,remetente_nome,mensagem_texto,categoria,rascunho,status,erro,recebida_em,criada_em` +
    `&organization_id=eq.${encodeURIComponent(orgId)}&status=in.(pendente,aprovada,erro)&order=recebida_em.desc&limit=100`) || [];
}

// Ações da fila: editar, aprovar, descartar e enviar. Enviar exige DM_ENVIO e janela aberta.
async function acaoDM({ orgId, id, acao, texto, cfg, f, chave, env, agora }) {
  const linhas = await rest(cfg, f, 'GET',
    `dm_respostas?select=*&id=eq.${encodeURIComponent(id)}&organization_id=eq.${encodeURIComponent(orgId)}`) || [];
  const linha = linhas[0];
  if (!linha) throw new ErroResposta('Mensagem não encontrada.', 404);
  const abertas = ['pendente', 'aprovada', 'erro'];
  const atualizar = (dados) => rest(cfg, f, 'PATCH', `dm_respostas?id=eq.${encodeURIComponent(id)}`,
    { ...dados, atualizada_em: new Date(agora).toISOString() }, { Prefer: 'return=minimal' });

  if (acao === 'editar') {
    if (!abertas.includes(linha.status)) throw new ErroResposta('Esta resposta já foi enviada ou descartada.', 409);
    const novo = String(texto || '').trim().slice(0, 1000);
    if (!novo) throw new ErroResposta('O texto da resposta está vazio.', 400);
    await atualizar({ rascunho: novo });
    return { status: linha.status, rascunho: novo };
  }
  if (acao === 'aprovar') {
    if (linha.status !== 'pendente') throw new ErroResposta('Só dá para aprovar resposta pendente.', 409);
    if (!rascunhoPronto(linha.rascunho)) throw new ErroResposta('Escreva o texto da resposta antes de aprovar.', 400);
    await atualizar({ status: 'aprovada' });
    return { status: 'aprovada' };
  }
  if (acao === 'descartar') {
    if (!abertas.includes(linha.status)) throw new ErroResposta('Esta resposta já foi enviada ou descartada.', 409);
    await atualizar({ status: 'descartada' });
    return { status: 'descartada' };
  }
  if (acao === 'enviar') {
    if (!dmEnvioLigado(env)) throw new ErroResposta('O envio de mensagens ainda não está liberado. Falta a permissão de mensagens da Meta.', 409);
    if (!abertas.includes(linha.status) || !rascunhoPronto(linha.rascunho)) throw new ErroResposta('Não há resposta pronta para enviar.', 409);
    if (!janelaAberta(linha.recebida_em, agora)) throw new ErroResposta('A janela de 24 horas fechou. Não dá para responder mais.', 409);
    const { conta, token } = await contaComToken({ cfg, f, chave, contaId: linha.social_account_id, agora, orgId });
    try {
      await enviarDM({ conta, token, destinatarioId: linha.remetente_id, texto: linha.rascunho, f });
      await atualizar({ status: 'enviada', enviada_em: new Date(agora).toISOString(), erro: null });
      return { status: 'enviada' };
    } catch (e) {
      await atualizar({ status: 'erro', erro: String(e.message).slice(0, 300) });
      throw e;
    }
  }
  throw new ErroResposta('Ação desconhecida.', 400);
}

module.exports = {
  janelaAberta, dmEnvioLigado, buscarConversas, buscarUltimaMensagem, enviarDM,
  sincronizarDMs, listarDMs, acaoDM, JANELA_MS, TEXTO_MAX_BYTES
};
