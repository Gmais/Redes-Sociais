'use strict';
// Programação no servidor: cria a semana seguinte das programações e agenda na Zernio,
// mesmo com o painel fechado. Chamado todo dia pelo GitHub Actions (.github/workflows/programacao.yml),
// que bate em /api/analise?acao=programacao-cron, protegida por CRON_SECRET.
//
// Usa a mesma regra do painel (programacao.js) e grava no mesmo estado (painel_gilson_state).
// Cards, imagens e publicações entram pelo merge_panel_state (só o que mudou), como o navegador faz,
// para não apagar nada que o painel tenha gravado no meio do caminho.
// É idempotente: data já gerada não se repete, e card já enviado (ou com erro) não é enviado de novo.

const { rest } = require('./meta-oauth');
const { configSupabase } = require('./supabase-server');
const Programacao = require('../programacao.js');

const ZERNIO_BASE = 'https://zernio.com/api/v1';

// Mesmos IDs e chaves do api/publish-zernio.js. Se trocar a conta lá, troque aqui também.
const CONTAS = {
  academia: { variavelConta: 'ZERNIO_ACCOUNT_ACADEMIA', padrao: '6ace80c0a737012bc49cb80c', variavelChave: 'ZERNIO_API_KEY' },
  sorveteria: { variavelConta: 'ZERNIO_ACCOUNT_SORVETERIA', padrao: '6a3916335f7d1751ab4afbe3', variavelChave: 'ZERNIO_API_KEY' },
  gympulse: { variavelConta: 'ZERNIO_ACCOUNT_GYMPULSE', padrao: '6a3920625f7d1751ab4b6fdc', variavelChave: 'ZERNIO_API_KEY_GYMPULSE' }
};

// Prefixo do ID do card -> empresa (mesmo critério de applySavedEdits no index.html)
const EMPRESA_POR_PREFIXO = { ac: 'academia', so: 'sorveteria', gy: 'gympulse' };

// Mesmo texto de FORMAT_SPECS no index.html (usado em formatSpec)
const FORMAT_SPECS = {
  Story: { tipo: 'Story Instagram', dimensoes: '1080 × 1920px (9:16)' },
  Post: { tipo: 'Post Feed Instagram', dimensoes: '1080 × 1350px (4:5)' },
  Carrossel: { tipo: 'Carrossel', dimensoes: '1080 × 1350px (4:5)' },
  Reel: { tipo: 'Reel', dimensoes: '1080 × 1920px (9:16)' }
};

const EXT_VIDEO = /\.(mp4|mov|m4v|webm|avi|mpeg)(\?|#|$)/i;
const JANELA_DIAS = 7;
const MARGEM_MS = 60000; // não agenda horário a menos de 1 minuto
const ORCAMENTO_MS = 40000; // a rota da Vercel tem 60s; o que sobrar fica para a próxima execução
const PAUSA_MS = 1000;

// Dia de hoje em Brasília (AAAA-MM-DD)
function hojeBR(agora) {
  return new Date(agora).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}

function formatSpec(fmt) {
  const s = FORMAT_SPECS[fmt] || FORMAT_SPECS.Post;
  return 'Tipo: ' + s.tipo + '\nDimensões: ' + s.dimensoes + '\nRegra 60-30-10: a definir\nTexto max: 20%.';
}

// Card no mesmo formato que o painel grava em edits_<id> (sem o id, que é a própria chave)
function cardDaProgramacao(regra, novo) {
  const v = novo.variante || {};
  const hora = String(v.hora || regra.hora || '09:00').replace(':', 'h');
  return {
    date: novo.data,
    time: hora,
    format: regra.formato || 'Post',
    title: v.titulo || regra.nome,
    texto: v.texto || '',
    secoes: [
      { num: '01', cor: '#e63900', titulo: 'FORMATO E ESPECIFICAÇÕES', conteudo: formatSpec(regra.formato || 'Post') },
      { num: '02', cor: '#f5a623', titulo: 'INTENÇÃO DA POSTAGEM', conteudo: 'Programação: ' + regra.nome + '. Opção escolhida automaticamente.' },
      { num: '03', cor: '#4ade80', titulo: 'BRIEFING CRIATIVO DETALHADO', conteudo: 'A preencher' }
    ]
  };
}

// Imagem do card no mesmo formato de progCriarCard (link colado na programação)
function imagemDaProgramacao(link, iso) {
  return {
    status: 'ok', viewUrl: link, zernioUrl: link, zernioStatus: 'ok', zernioAt: iso,
    fileName: 'imagem-programada', isVideo: false, uploadedAt: iso
  };
}

// Conta e chave da empresa, com as mesmas variáveis do api/publish-zernio.js
function configDaEmpresa(empresa, env) {
  const c = CONTAS[empresa];
  if (!c) return null;
  return {
    accountId: env[c.variavelConta] || c.padrao,
    chave: env[c.variavelChave] || env.ZERNIO_API_KEY || ''
  };
}

// Agenda um post na Zernio no horário do card. Devolve o estado de publicação que o painel entende.
async function agendarNaZernio({ empresa, card, imagem, env, f, agora }) {
  const cfg = configDaEmpresa(empresa, env);
  const iso = new Date(agora).toISOString();
  const agendado = new Date(Programacao.dataHoraMs(card.date, card.time)).toISOString();
  const alvo = { platform: 'instagram', accountId: cfg.accountId };
  if (String(card.format || '').toLowerCase() === 'story') alvo.platformSpecificData = { contentType: 'story' };
  const resp = await f(`${ZERNIO_BASE}/posts`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.chave}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: card.texto || '',
      mediaItems: [{ type: EXT_VIDEO.test(imagem) ? 'video' : 'image', url: imagem }],
      platforms: [alvo],
      scheduledFor: agendado,
      timezone: 'America/Sao_Paulo'
    })
  });
  const dados = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const motivo = typeof dados.error === 'string' ? dados.error : JSON.stringify(dados.error || dados);
    return { status: 'error', errorMsg: ('Zernio recusou: ' + motivo).slice(0, 300), failedAt: iso };
  }
  const postId = (dados.post && dados.post._id) || dados._id || null;
  return { status: 'sent', postId, sentAt: iso, scheduledFor: agendado };
}

// Grava só o que mudou, pela mesma RPC que o navegador usa (união feita no banco).
async function gravarDelta(cfg, f, patches) {
  const limpo = {};
  Object.keys(patches).forEach((k) => {
    if (patches[k] && Object.keys(patches[k]).length) limpo[k] = patches[k];
  });
  if (!Object.keys(limpo).length) return;
  await rest(cfg, f, 'POST', 'rpc/merge_panel_state', { patches: limpo });
}

async function gravarProgramacao(cfg, f, programacao, iso) {
  await rest(cfg, f, 'POST', 'painel_gilson_state', [{ key: 'programacao', value: programacao, updated_at: iso }],
    { Prefer: 'resolution=merge-duplicates,return=minimal' });
}

// Gera a semana seguinte de cada programação ativa e agenda na Zernio os cards de hoje e de amanhã.
async function gerarEAgendar({ env, f, agora, pausa = PAUSA_MS, orcamentoMs = ORCAMENTO_MS, relogio = Date.now }) {
  const inicio = relogio();
  const cfg = configSupabase(env);
  const linhas = await rest(cfg, f, 'GET',
    'painel_gilson_state?key=in.(programacao,edits,images,published,deleted)&select=key,value') || [];
  const mapa = {};
  linhas.forEach((l) => { mapa[l.key] = l.value; });
  const prog = mapa.programacao && Array.isArray(mapa.programacao.regras)
    ? mapa.programacao : { regras: [], feriadosExtras: [] };
  const edits = Object.assign({}, mapa.edits || {});
  const images = Object.assign({}, mapa.images || {});
  const published = Object.assign({}, mapa.published || {});
  const apagados = new Set(Array.isArray(mapa.deleted) ? mapa.deleted : []);
  const hoje = hojeBR(agora);
  const iso = new Date(agora).toISOString();
  const resumo = { criados: 0, agendados: 0, erros: 0, sem_dados: 0, sem_chave: 0, pendentes_proxima_execucao: 0, aguardando: 0 };

  // 1. Semana seguinte: cria os cards que faltam. planejarRegra não repete data já gerada.
  const novosEdits = {};
  const novasImagens = {};
  const regrasNovas = [];
  for (const regra of prog.regras) {
    const plano = Programacao.planejarRegra(regra, hoje, JANELA_DIAS, prog.feriadosExtras || []);
    regrasNovas.push(plano.regra);
    for (const novo of plano.novos) {
      // Não sobrescreve card que já existe (pode ter sido editado no painel) nem o que a pessoa apagou.
      if (edits[novo.cardId] || apagados.has(novo.cardId)) continue;
      novosEdits[novo.cardId] = cardDaProgramacao(plano.regra, novo);
      if (novo.variante && novo.variante.imagem) novasImagens[novo.cardId] = imagemDaProgramacao(novo.variante.imagem, iso);
      resumo.criados++;
    }
  }
  // Cards antes da programação: se cair no meio, a próxima execução tenta de novo sem perder card.
  await gravarDelta(cfg, f, { edits: novosEdits, images: novasImagens });
  if (resumo.criados > 0) await gravarProgramacao(cfg, f, Object.assign({}, prog, { regras: regrasNovas }), iso);
  Object.assign(edits, novosEdits);
  Object.assign(images, novasImagens);

  // 2. Agenda na Zernio os cards pendentes. Não só os de agora: também os que ficaram sem imagem
  //    ou que a execução anterior não terminou.
  const candidatos = Object.keys(edits).filter((id) =>
    id.includes('_prog_') && !apagados.has(id) && !published[id]);
  for (const id of candidatos) {
    const card = edits[id];
    if (!(Programacao.dataHoraMs(card.date, card.time) > agora + MARGEM_MS)) continue;
    // Só agenda hoje e amanhã. Cards de datas mais distantes ficam editáveis até o dia anterior.
    if (card.date > hojeBR(agora + 24 * 3600000)) { resumo.aguardando++; continue; }
    const empresa = EMPRESA_POR_PREFIXO[id.slice(0, 2)];
    if (!empresa) continue;
    const img = images[id];
    if (!img || img.status !== 'ok' || !img.zernioUrl || !String(card.texto || '').trim()) {
      resumo.sem_dados++;
      continue;
    }
    if (!configDaEmpresa(empresa, env).chave) { resumo.sem_chave++; continue; }
    if (relogio() - inicio > orcamentoMs) { resumo.pendentes_proxima_execucao++; continue; }

    // Marca antes de chamar a Zernio: se a função cair no meio, a próxima execução não agenda de novo.
    published[id] = { status: 'publishing', startedAt: new Date(relogio()).toISOString() };
    await gravarDelta(cfg, f, { published: { [id]: published[id] } });
    let pub;
    try {
      pub = await agendarNaZernio({ empresa, card, imagem: img.zernioUrl, env, f, agora: relogio() });
    } catch (e) {
      pub = { status: 'error', errorMsg: 'Falha de conexão com a Zernio: ' + e.message, failedAt: new Date(relogio()).toISOString() };
    }
    published[id] = pub;
    await gravarDelta(cfg, f, { published: { [id]: pub } });
    if (pub.status === 'sent') resumo.agendados++; else resumo.erros++;
    if (pausa) await new Promise((r) => setTimeout(r, pausa));
  }
  return resumo;
}

module.exports = { gerarEAgendar, hojeBR, formatSpec, cardDaProgramacao, imagemDaProgramacao, agendarNaZernio, JANELA_DIAS };
