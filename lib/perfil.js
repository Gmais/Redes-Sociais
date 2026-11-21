'use strict';
// Auditoria do perfil (skill ig-profile), só com o que a API devolve.
// Os itens que a API não mostra (posts fixados, destaques, capas do grid, foto, categoria e stories)
// ficam de fora da nota e aparecem como "não verificado". Nada é inventado.

const { hostDaConta } = require('./sync-instagram');

const VERSAO = 'v27.0';
const CAMPOS = 'username,name,biography,website,followers_count,media_count';

// Itens da rubrica que a API consegue verificar (pontos máximos somam 56)
const NAO_VERIFICADOS = [
  { id: 'pinned_three', titulo: 'Posts fixados', max: 10 },
  { id: 'highlights', titulo: 'Destaques', max: 8 },
  { id: 'grid_legibility', titulo: 'Capas do grid', max: 8 },
  { id: 'photo', titulo: 'Foto', max: 6 },
  { id: 'category_contact', titulo: 'Categoria e contato', max: 6 },
  { id: 'story_presence', titulo: 'Stories', max: 6 }
];

class ErroPerfil extends Error {
  constructor(mensagem, status = 502) {
    super(mensagem);
    this.status = status;
  }
}

async function lerJson(r) {
  const texto = await r.text();
  try { return texto ? JSON.parse(texto) : {}; } catch (e) { return {}; }
}

// Lê os campos públicos do perfil da conta (com o token da própria conta).
async function buscarPerfilDaConta({ conta, token, f }) {
  const q = new URLSearchParams({ fields: CAMPOS, access_token: token });
  const r = await f(`${hostDaConta(conta)}/${VERSAO}/${encodeURIComponent(conta.external_id)}?${q.toString()}`);
  const dados = await lerJson(r);
  if (!r.ok) throw new ErroPerfil(`Meta: ${(dados.error && dados.error.message) || 'não respondeu'}`.slice(0, 300), 502);
  return dados;
}

// Nota de 0 a 100 sobre os itens verificáveis. publicacoesUltimos7Dias vem do banco (sincronizado).
function auditar({ perfil, publicacoesUltimos7Dias }) {
  const p = perfil || {};
  const bio = String(p.biography || '').trim();
  const primeira = bio.split('\n')[0] || '';
  const nome = String(p.name || '').trim();
  const usuario = String(p.username || '').trim();
  const itens = [];
  const add = (id, titulo, pontos, max, status, dica) => itens.push({ id, titulo, pontos, max, status, dica });

  if (!nome) add('name_field', 'Campo de nome', 0, 12, 'falta', 'Coloque o nome e o que você faz, em palavras que as pessoas buscam (até 30 caracteres).');
  else if (nome.toLowerCase() === usuario.toLowerCase()) add('name_field', 'Campo de nome', 6, 12, 'parcial', 'O nome é igual ao usuário. Acrescente o que você faz.');
  else add('name_field', 'Campo de nome', 12, 12, 'ok', '');

  if (!bio) add('bio_first_line', 'Primeira linha da bio', 0, 12, 'falta', 'A bio está vazia. A primeira linha diz para quem é e o que muda para essa pessoa.');
  else if (primeira.length < 20) add('bio_first_line', 'Primeira linha da bio', 6, 12, 'parcial', 'A primeira linha é curta demais para dizer para quem é.');
  else add('bio_first_line', 'Primeira linha da bio', 12, 12, 'ok', '');

  if (!bio) add('bio_body', 'Corpo da bio', 0, 8, 'falta', 'Use o espaço para uma prova ou uma oferta específica.');
  else if (bio.length >= 60 && bio.length <= 150) add('bio_body', 'Corpo da bio', 8, 8, 'ok', '');
  else add('bio_body', 'Corpo da bio', 4, 8, 'parcial', bio.length > 150 ? 'A bio passa de 150 caracteres.' : 'A bio é curta. Use mais espaço com uma prova ou uma oferta.');

  if (p.website) add('link', 'Link', 8, 8, 'ok', '');
  else add('link', 'Link', 0, 8, 'falta', 'Coloque um link que combine com o que a bio promete.');

  const usuarioOk = /^[a-z0-9._]{3,24}$/i.test(usuario) && (usuario.match(/_/g) || []).length <= 1 && !/__/.test(usuario);
  add('handle', 'Usuário', usuarioOk ? 6 : 3, 6, usuarioOk ? 'ok' : 'parcial', usuarioOk ? '' : 'Use um usuário fácil de soletrar e de falar em voz alta.');

  if ((Number(publicacoesUltimos7Dias) || 0) >= 1) add('recent_activity', 'Atividade recente', 10, 10, 'ok', '');
  else add('recent_activity', 'Atividade recente', 0, 10, 'falta', 'Nenhuma publicação nos últimos 7 dias. Perfil parado passa a sensação de conta fechada.');

  const maximo = itens.reduce((s, x) => s + x.max, 0);
  const pontos = itens.reduce((s, x) => s + x.pontos, 0);
  return {
    nota: Math.round((pontos / maximo) * 100),
    itens,
    naoVerificados: NAO_VERIFICADOS,
    bio,
    nome,
    usuario,
    link: p.website || null,
    seguidores: p.followers_count ?? null
  };
}

module.exports = { auditar, buscarPerfilDaConta, ErroPerfil, CAMPOS, NAO_VERIFICADOS };
