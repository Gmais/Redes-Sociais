'use strict';
// Respostas a comentários dos próprios posts (Fase 2).
// Leitura, classificação e rascunho funcionam com as permissões atuais.
// O envio só acontece com RESPOSTAS_ENVIO=ligado no Vercel, depois que a Meta liberar
// a permissão de comentários. Sem isso, o botão "Enviar" fica bloqueado.
// Automático só nas simples (agradecimento e emoji), e só com o envio ligado.

const { rest } = require('./meta-oauth');
const { decifrarToken } = require('./token-vault');
const { hostDaConta } = require('./sync-instagram');
const escrita = require('./escrita');

const VERSAO = 'v27.0';
const CATEGORIAS = ['agradecimento', 'emoji', 'pergunta', 'reclamacao', 'outro'];
const SIMPLES = ['agradecimento', 'emoji'];
const LIMITE_POSTS = 5;
const LIMITE_COMENTARIOS_POR_POST = 25;
const LIMITE_RASCUNHOS_POR_RODADA = 5;

class ErroResposta extends Error {
  constructor(mensagem, status = 400) {
    super(mensagem);
    this.status = status;
  }
}

async function lerJson(r) {
  const texto = await r.text();
  try { return texto ? JSON.parse(texto) : {}; } catch (e) { return {}; }
}

function mensagemDaMeta(dados) {
  const erro = (dados && dados.error) || {};
  return erro.message ? `Meta: ${erro.message}`.slice(0, 300) : 'A Meta não respondeu. Tente de novo.';
}

// Categoria por heurística simples. Só serve para decidir o que é "simples" e o que precisa de olho.
function classificar(texto) {
  const t = String(texto || '').trim();
  if (!t) return 'outro';
  const semEmoji = t.replace(/[\p{Extended_Pictographic}\s‍️]/gu, '');
  if (!semEmoji) return 'emoji';
  if (/(péssim|horr[ií]vel|golpe|reclam|cancel|nunca mais|decepcion|enganos|vergonha|processo)/i.test(t)) return 'reclamacao';
  if (/\?/.test(t) || /^(qual|quais|quanto|como|onde|quando|tem|pode|posso|voc[eê]s)\b/i.test(t)) return 'pergunta';
  if (/(obrigad|valeu|gratid|amei|parab[eé]ns|\bshow\b|\btop\b|lindo|linda|incr[ií]vel|maravilh)/i.test(t)) return 'agradecimento';
  return 'outro';
}

function ehSimples(categoria) {
  return SIMPLES.includes(categoria);
}

function envioLigado(env) {
  return String((env && env.RESPOSTAS_ENVIO) || '').toLowerCase() === 'ligado';
}

// Só envia rascunho pronto: sem placeholder {{...}} e com texto.
function rascunhoPronto(texto) {
  const t = String(texto || '').trim();
  return t.length > 0 && !/\{\{/.test(t);
}

// Comentários de um post (a Meta devolve os mais recentes). Comentários ocultos ficam de fora.
async function buscarComentarios({ conta, token, postExternalId, f }) {
  const q = new URLSearchParams({
    fields: 'id,text,timestamp,username,hidden',
    limit: String(LIMITE_COMENTARIOS_POR_POST),
    access_token: token
  });
  const r = await f(`${hostDaConta(conta)}/${VERSAO}/${encodeURIComponent(postExternalId)}/comments?${q.toString()}`);
  const dados = await lerJson(r);
  if (!r.ok) throw new ErroResposta(mensagemDaMeta(dados), 502);
  return (dados.data || []).filter((c) => !c.hidden);
}

// Publica a resposta como resposta ao comentário. Só é chamada com o envio ligado.
async function enviarResposta({ conta, token, commentId, texto, f }) {
  const q = new URLSearchParams({ message: texto, access_token: token });
  const r = await f(`${hostDaConta(conta)}/${VERSAO}/${encodeURIComponent(commentId)}/replies?${q.toString()}`, { method: 'POST' });
  const dados = await lerJson(r);
  if (!r.ok) throw new ErroResposta(mensagemDaMeta(dados), 502);
  return dados;
}

// Rascunho da resposta, com a mesma checagem de texto das outras saídas.
async function rascunhar({ comentario, env, f }) {
  const r = await escrita.gerar({ tipo: 'resposta', pedido: comentario, apiKey: env.OPENAI_API_KEY, env, f });
  return { texto: r.texto, notas: r.notas };
}

// Conta e token prontos para uso. Lança ErroResposta se a conta não puder falar com a Meta.
async function contaComToken({ cfg, f, chave, contaId, agora, orgId }) {
  // A conta tem de pertencer à organização da pessoa que pediu. Sem isso, qualquer ID serviria.
  const contas = await rest(cfg, f, 'GET',
    `social_accounts?select=id,external_id,username,parent_external_id&id=eq.${encodeURIComponent(contaId)}&organization_id=eq.${encodeURIComponent(orgId)}`) || [];
  const conta = contas[0];
  if (!conta) throw new ErroResposta('Conta não encontrada.', 404);
  const linhas = await rest(cfg, f, 'GET',
    `social_tokens?select=access_token_encrypted,token_expires_at&social_account_id=eq.${encodeURIComponent(conta.id)}`) || [];
  const t = linhas[0];
  if (!t) throw new ErroResposta('A conta não tem token guardado. Reconecte a conta.', 400);
  if (t.token_expires_at && Date.parse(t.token_expires_at) <= agora) {
    throw new ErroResposta('O token da conta expirou. Reconecte a conta.', 400);
  }
  return { conta, token: decifrarToken(t.access_token_encrypted, conta.id, chave) };
}

// Fila da tela: pendentes, aprovadas e com erro, mais recentes primeiro.
async function listarRespostas({ orgId, cfg, f }) {
  return await rest(cfg, f, 'GET',
    `comentarios_respostas?select=id,social_account_id,social_post_id,comment_texto,comment_usuario,comment_em,categoria,rascunho,status,erro,enviada_em,criada_em` +
    `&organization_id=eq.${encodeURIComponent(orgId)}&status=in.(pendente,aprovada,erro)&order=criada_em.desc&limit=100`) || [];
}

// Lê os comentários dos posts mais recentes de cada conta e grava os novos na fila.
// Gera rascunho para até LIMITE_RASCUNHOS_POR_RODADA. Com o envio ligado, as simples saem sozinhas.
async function sincronizarRespostas({ orgId, cfg, f, chave, env, agora }) {
  const contas = await rest(cfg, f, 'GET',
    `social_accounts?select=id,username&organization_id=eq.${encodeURIComponent(orgId)}&platform=eq.instagram&status=eq.active`) || [];
  const resumo = { contas: 0, novos: 0, rascunhos: 0, enviados: 0, avisos: [] };
  let rascunhosFeitos = 0;
  for (const linha of contas) {
    let conta;
    let token;
    try {
      ({ conta, token } = await contaComToken({ cfg, f, chave, contaId: linha.id, agora, orgId }));
    } catch (e) {
      resumo.avisos.push(`${linha.username}: ${e.message}`);
      continue;
    }
    resumo.contas += 1;
    const posts = await rest(cfg, f, 'GET',
      `social_posts?select=id,external_id&social_account_id=eq.${encodeURIComponent(conta.id)}&order=published_at.desc&limit=${LIMITE_POSTS}`) || [];
    const jaTem = new Set((await rest(cfg, f, 'GET',
      `comentarios_respostas?select=comment_external_id&social_account_id=eq.${encodeURIComponent(conta.id)}&limit=1000`) || [])
      .map((x) => String(x.comment_external_id)));
    for (const post of posts) {
      let comentarios;
      try {
        comentarios = await buscarComentarios({ conta, token, postExternalId: post.external_id, f });
      } catch (e) {
        resumo.avisos.push(`${conta.username}: ${e.message}`);
        continue;
      }
      for (const c of comentarios) {
        const id = String(c.id);
        if (jaTem.has(id)) continue;
        jaTem.add(id);
        const categoria = classificar(c.text);
        let rascunho = null;
        let erro = null;
        if (rascunhosFeitos < LIMITE_RASCUNHOS_POR_RODADA) {
          rascunhosFeitos += 1;
          try {
            rascunho = (await rascunhar({ comentario: c.text, env, f })).texto;
            resumo.rascunhos += 1;
          } catch (e) {
            erro = e.message;
          }
        }
        let status = 'pendente';
        let enviadaEm = null;
        if (rascunhoPronto(rascunho) && ehSimples(categoria) && envioLigado(env)) {
          try {
            await enviarResposta({ conta, token, commentId: id, texto: rascunho, f });
            status = 'enviada';
            enviadaEm = new Date(agora).toISOString();
            resumo.enviados += 1;
          } catch (e) {
            status = 'erro';
            erro = e.message;
          }
        }
        await rest(cfg, f, 'POST', 'comentarios_respostas?on_conflict=social_account_id,comment_external_id', {
          organization_id: orgId,
          social_account_id: conta.id,
          social_post_id: post.id,
          comment_external_id: id,
          comment_texto: String(c.text || '').slice(0, 2000),
          comment_usuario: c.username || null,
          comment_em: c.timestamp || null,
          categoria,
          rascunho,
          status,
          erro,
          enviada_em: enviadaEm
        }, { Prefer: 'return=minimal,resolution=ignore-duplicates' });
        resumo.novos += 1;
      }
    }
  }
  return resumo;
}

// Ações da fila: editar, aprovar, descartar e enviar. Enviar exige o envio ligado.
async function acaoResposta({ orgId, id, acao, texto, cfg, f, chave, env, agora }) {
  const linhas = await rest(cfg, f, 'GET',
    `comentarios_respostas?select=*&id=eq.${encodeURIComponent(id)}&organization_id=eq.${encodeURIComponent(orgId)}`) || [];
  const linha = linhas[0];
  if (!linha) throw new ErroResposta('Comentário não encontrado.', 404);
  const abertas = ['pendente', 'aprovada', 'erro'];
  const atualizar = (dados) => rest(cfg, f, 'PATCH', `comentarios_respostas?id=eq.${encodeURIComponent(id)}`,
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
    if (!envioLigado(env)) throw new ErroResposta('O envio ainda não está liberado. Falta a permissão de comentários da Meta.', 409);
    if (!abertas.includes(linha.status) || !rascunhoPronto(linha.rascunho)) {
      throw new ErroResposta('Não há resposta pronta para enviar.', 409);
    }
    const { conta, token } = await contaComToken({ cfg, f, chave, contaId: linha.social_account_id, agora, orgId });
    try {
      await enviarResposta({ conta, token, commentId: linha.comment_external_id, texto: linha.rascunho, f });
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
  listarRespostas, sincronizarRespostas, acaoResposta, contaComToken,
  classificar, ehSimples, envioLigado, rascunhoPronto,
  buscarComentarios, enviarResposta, rascunhar,
  CATEGORIAS, SIMPLES, LIMITE_POSTS, LIMITE_RASCUNHOS_POR_RODADA, ErroResposta, lerJson, mensagemDaMeta,
  // Usados pelo sincronismo e pelas ações (acoplados ao banco, testados nas funções acima)
  rest, decifrarToken, hostDaConta
};
