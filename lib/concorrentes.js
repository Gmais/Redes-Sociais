// Concorrentes (Business Discovery): só dados públicos de contas profissionais (comercial ou criador).
// Nada de insights, alcance ou dados privados. A consulta sai de uma conta já conectada da
// organização (o token dela) e vai para graph.facebook.com.
//
// Campos pedidos: só os que aparecem na documentação da Meta (IG User > business_discovery):
// followers_count, media_count e, em media, media_type, timestamp, like_count, comments_count, permalink.
// media_product_type e media.limit NÃO são pedidos porque não estão confirmados nessa consulta.
// Por isso reels e vídeos caem juntos no tipo "vídeo" (media_type VIDEO).

const { rest } = require('./meta-oauth');
const { decifrarToken } = require('./token-vault');
const { tipoDeConteudo, diaBR } = require('./sync-instagram');
const { lerTodas } = require('./publicacoes');

const VERSAO = 'v27.0';
const HOST = 'https://graph.facebook.com';
const JANELA_DIAS = 30;
const DIA_MS = 24 * 3600 * 1000;
const HANDLE = /^[A-Za-z0-9._]{1,30}$/;
const MAX_HISTORICO = 60;

// Erro com mensagem para a tela. O status diz o tipo: 400 (algo a fazer na conta), 409 (já existe),
// 422 (o perfil não pode ser lido), 429 (limite da Meta).
class ErroConcorrente extends Error {
  constructor(mensagem, status = 422) {
    super(mensagem);
    this.status = status;
  }
}

// Entrada do usuário: aceita "@perfil" ou "perfil". Devolve null se não for um @ válido do Instagram.
function normalizarHandle(entrada) {
  const h = String(entrada || '').trim().replace(/^@+/, '');
  return HANDLE.test(h) ? h : null;
}

function mensagemNaoLido(handle) {
  return `Não foi possível ler @${handle}. Confira o nome e se a conta é profissional (comercial ou criador) e pública.`;
}

// Traduz o erro da Meta para o que a pessoa precisa fazer. O detalhe técnico não vai para a tela.
function erroDaMeta(erro, handle) {
  const codigo = erro && erro.code;
  if (codigo === 190) return new ErroConcorrente('O token da conta de consulta expirou. Reconecte a conta.', 400);
  if ([4, 17, 32, 613].includes(codigo)) {
    return new ErroConcorrente('Limite de consultas da Meta atingido. Tente de novo em alguns minutos.', 429);
  }
  return new ErroConcorrente(mensagemNaoLido(handle), 422);
}

// Consulta o perfil público. Lança ErroConcorrente com mensagem para a tela.
async function buscarPerfil({ igUserId, token, handle, f }) {
  const campos = `business_discovery.username(${handle}){followers_count,media_count,media{media_type,timestamp,like_count,comments_count,permalink}}`;
  const q = new URLSearchParams({ fields: campos, access_token: token });
  const r = await f(`${HOST}/${VERSAO}/${encodeURIComponent(igUserId)}?${q.toString()}`);
  const texto = await r.text();
  let dados = {};
  try { dados = texto ? JSON.parse(texto) : {}; } catch (e) { /* corpo não-JSON */ }
  if (!r.ok) throw erroDaMeta(dados.error, handle);
  if (!dados.business_discovery) throw new ErroConcorrente(mensagemNaoLido(handle), 422);
  return dados.business_discovery;
}

// Resume as publicações devolvidas (até o limite da própria Meta). Campo sem dado fica null.
function resumirPublicacoes(midias, agora) {
  const lista = Array.isArray(midias) ? midias : [];
  const corte = agora - JANELA_DIAS * DIA_MS;
  const datas = lista.map((m) => Date.parse(m.timestamp)).filter((t) => Number.isFinite(t));
  const ultima = datas.length ? Math.max(...datas) : null;
  const publicacoes30d = datas.filter((t) => t >= corte).length;

  // Engajamento = curtidas + comentários. Post sem nenhum dos dois (curtidas ocultas) não entra na média.
  const medidas = lista.filter((m) => m.like_count != null || m.comments_count != null);
  const soma = medidas.reduce((s, m) => s + (Number(m.like_count) || 0) + (Number(m.comments_count) || 0), 0);
  const engajamentoMedio = medidas.length ? Math.round((soma / medidas.length) * 10) / 10 : null;

  const tipos = { post: 0, reel: 0, story: 0, carousel: 0, video: 0, other: 0 };
  for (const m of lista) tipos[tipoDeConteudo(m)] += 1;

  return {
    amostra: lista.length,
    publicacoes30d,
    engajamentoMedio,
    tipos,
    ultimaPublicacaoEm: ultima ? new Date(ultima).toISOString() : null
  };
}

// Conta da organização que faz a consulta: a primeira conectada e ativa, com token válido.
async function contaDeConsulta({ orgId, cfg, f, chave, agora }) {
  const contas = await rest(cfg, f, 'GET',
    `social_accounts?select=id,external_id,username&organization_id=eq.${encodeURIComponent(orgId)}` +
    `&platform=eq.instagram&status=eq.active&order=username.asc&limit=1`) || [];
  const conta = contas[0];
  if (!conta) return { erro: 'Conecte uma conta do Instagram antes de consultar concorrentes.' };
  const linhas = await rest(cfg, f, 'GET',
    `social_tokens?select=access_token_encrypted,token_expires_at&social_account_id=eq.${encodeURIComponent(conta.id)}`) || [];
  const t = linhas[0];
  if (!t) return { erro: 'A conta de consulta não tem token guardado. Reconecte a conta.' };
  if (t.token_expires_at && Date.parse(t.token_expires_at) <= agora) {
    return { erro: 'O token da conta de consulta expirou. Reconecte a conta.' };
  }
  return { conta, token: decifrarToken(t.access_token_encrypted, conta.id, chave) };
}

async function gravarResumo({ cfg, f, orgId, competidorId, perfil, resumo, agora }) {
  await rest(cfg, f, 'POST', 'competitor_snapshots', {
    competitor_id: competidorId,
    organization_id: orgId,
    captured_at: new Date(agora).toISOString(),
    followers_count: perfil.followers_count ?? null,
    media_count: perfil.media_count ?? null,
    source: 'business_discovery',
    publicacoes_30d: resumo.publicacoes30d,
    engajamento_medio: resumo.engajamentoMedio,
    amostra_publicacoes: resumo.amostra,
    tipos: resumo.tipos,
    ultima_publicacao_em: resumo.ultimaPublicacaoEm
  }, { Prefer: 'return=minimal' });
}

// Consulta um concorrente e grava o resumo. Lança ErroConcorrente se a Meta não devolver o perfil.
async function atualizarConcorrente({ concorrente, consulta, orgId, cfg, f, agora }) {
  const perfil = await buscarPerfil({ igUserId: consulta.conta.external_id, token: consulta.token, handle: concorrente.handle, f });
  const midias = perfil.media && Array.isArray(perfil.media.data) ? perfil.media.data : [];
  const resumo = resumirPublicacoes(midias, agora);
  await gravarResumo({ cfg, f, orgId, competidorId: concorrente.id, perfil, resumo, agora });
  return { perfil, resumo };
}

// Atualiza todos os concorrentes da organização. Um falhar não para os outros.
async function sincronizarConcorrentes({ orgId, cfg, f, chave, agora }) {
  const concorrentes = await rest(cfg, f, 'GET',
    `competitor_accounts?select=id,handle&organization_id=eq.${encodeURIComponent(orgId)}`) || [];
  if (!concorrentes.length) return { ok: true, resultados: [] };
  const consulta = await contaDeConsulta({ orgId, cfg, f, chave, agora });
  if (consulta.erro) return { ok: false, erro: consulta.erro, resultados: [] };
  const resultados = [];
  for (const c of concorrentes) {
    try {
      await atualizarConcorrente({ concorrente: c, consulta, orgId, cfg, f, agora });
      resultados.push({ handle: c.handle, ok: true });
    } catch (e) {
      resultados.push({ handle: c.handle, ok: false, erro: e.message || 'falha ao consultar' });
    }
  }
  return { ok: true, resultados };
}

// Cadastra um concorrente só depois de a Meta devolver o perfil público.
// Conta inexistente, privada ou pessoal não entra na lista. Handle é guardado em minúsculo (o Instagram não diferencia).
async function adicionarConcorrente({ orgId, userId, handle, displayName, empresa = null, cfg, f, chave, agora }) {
  const h = handle.toLowerCase();
  const existentes = await rest(cfg, f, 'GET',
    `competitor_accounts?select=id&organization_id=eq.${encodeURIComponent(orgId)}&handle=eq.${h}`) || [];
  if (existentes.length) throw new ErroConcorrente(`@${h} já está cadastrado.`, 409);

  const consulta = await contaDeConsulta({ orgId, cfg, f, chave, agora });
  if (consulta.erro) throw new ErroConcorrente(consulta.erro, 400);
  const perfil = await buscarPerfil({ igUserId: consulta.conta.external_id, token: consulta.token, handle: h, f });

  const criados = await rest(cfg, f, 'POST', 'competitor_accounts', {
    organization_id: orgId, platform: 'instagram', handle: h, display_name: displayName, added_by: userId, empresa: empresa || null
  }, { Prefer: 'return=representation' });
  const linha = Array.isArray(criados) ? criados[0] : null;
  if (!linha || !linha.id) throw new ErroConcorrente('Não foi possível cadastrar o concorrente. Tente de novo.', 500);

  const resumo = resumirPublicacoes((perfil.media && perfil.media.data) || [], agora);
  await gravarResumo({ cfg, f, orgId, competidorId: linha.id, perfil, resumo, agora });
  return { id: linha.id, handle: h, displayName, empresa: empresa || null };
}

// Lista para a tela: cada concorrente com o último resumo e o histórico de seguidores.
async function listarConcorrentes({ orgId, cfg, f }) {
  const org = encodeURIComponent(orgId);
  const contas = await rest(cfg, f, 'GET',
    `competitor_accounts?select=id,handle,display_name,empresa&organization_id=eq.${org}&order=handle.asc`) || [];
  const snaps = await lerTodas(cfg, f,
    `competitor_snapshots?select=competitor_id,captured_at,followers_count,media_count,publicacoes_30d,engajamento_medio,amostra_publicacoes,tipos,ultima_publicacao_em` +
    `&organization_id=eq.${org}&order=captured_at.desc,id.desc`);

  const porConcorrente = {};
  for (const s of snaps) (porConcorrente[s.competitor_id] = porConcorrente[s.competitor_id] || []).push(s);

  return contas.map((c) => {
    const lista = porConcorrente[c.id] || [];
    const u = lista[0];
    return {
      id: c.id,
      handle: c.handle,
      displayName: c.display_name || null,
      empresa: c.empresa || null,
      ultimo: u ? {
        capturadoEm: u.captured_at,
        seguidores: u.followers_count ?? null,
        totalPublicacoes: u.media_count ?? null,
        publicacoes30d: u.publicacoes_30d ?? null,
        engajamentoMedio: u.engajamento_medio == null ? null : Number(u.engajamento_medio),
        amostra: u.amostra_publicacoes ?? null,
        tipos: u.tipos || null,
        ultimaPublicacaoEm: u.ultima_publicacao_em || null
      } : null,
      historico: lista.slice(0, MAX_HISTORICO).reverse()
        .filter((s) => s.followers_count != null)
        .map((s) => ({ data: diaBR(Date.parse(s.captured_at)), seguidores: s.followers_count }))
    };
  });
}

// Muda a empresa de um concorrente já cadastrado da organização. empresa = null tira ele de todas.
async function definirEmpresaConcorrente({ orgId, id, empresa, cfg, f }) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id || ''))) {
    throw new ErroConcorrente('Concorrente inválido.', 400);
  }
  const org = encodeURIComponent(orgId);
  const cid = encodeURIComponent(id);
  const achados = await rest(cfg, f, 'GET', `competitor_accounts?select=id&id=eq.${cid}&organization_id=eq.${org}`) || [];
  if (!achados.length) throw new ErroConcorrente('Concorrente não encontrado nesta organização.', 404);
  await rest(cfg, f, 'PATCH', `competitor_accounts?id=eq.${cid}&organization_id=eq.${org}`, { empresa }, { Prefer: 'return=minimal' });
  return { id, empresa };
}

module.exports = {
  ErroConcorrente, normalizarHandle, buscarPerfil, resumirPublicacoes, contaDeConsulta,
  adicionarConcorrente, atualizarConcorrente, sincronizarConcorrentes, listarConcorrentes,
  definirEmpresaConcorrente
};
