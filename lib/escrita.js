'use strict';
// Escrita com IA para a Nova Postagem: legenda, carrossel, Reel, Story e repurpose.
// As regras vêm das skills ig-caption, ig-carousel, ig-reel, ig-story e ig-repurpose.
// A checagem de texto (humano.js) roda sobre o resultado antes de devolver.

const { chamarIA } = require('./analise-ia');
const humano = require('./humano');

const BASE = `Você escreve conteúdo para Instagram em português do Brasil, para um negócio real.
Responda somente com JSON neste formato: {"texto": "...", "notas": ["..."]}.
- Nada de dado inventado. Se faltar número, nome ou resultado, escreva {{preencher}} no lugar e diga isso em "notas".
- Escreva como uma pessoa. Sem travessão (—), sem aspas curvas e sem frases de IA como "no mundo de hoje", "é fundamental", "vale ressaltar".
- Não coloque link no corpo de legenda: legenda não é clicável.`;

const REGRAS = {
  legenda: `Tarefa: legenda de post.
- Primeira linha = gancho, até 125 caracteres, sem saudação e sem hashtag. Se o post for um Reel que já tem gancho falado, a primeira linha é o pedido (o que a pessoa faz), não outro gancho.
- Corpo: de 2 a 6 parágrafos curtos, com as palavras que a pessoa digitaria na busca.
- Um só pedido no fim (comentar uma palavra-chave, salvar ou mandar DM).
- No máximo 5 hashtags, específicas, no fim. Nada de #viral, #fyp ou #explorepage.`,
  carrossel: `Tarefa: carrossel de 6 a 10 slides, numerados (3/8).
- Slide 1 = capa: até 6 palavras, com uma linha de promessa.
- Slide 2 = por que isso importa, em uma frase.
- Slides do meio: uma ideia por slide, título de 3 a 7 palavras e até 25 palavras de texto.
- Penúltimo slide = recapitulação em lista, feita para a pessoa mandar em print.
- Último slide = uma ação só (salvar, comentar uma palavra ou seguir).
- Entregue o texto de cada slide, numerado.`,
  reel: `Tarefa: roteiro de Reel de 15 a 45 segundos, com uma ideia só.
- 0:00 a 0:02, gancho: a frase falada e o texto da tela, escritos em separado.
- 0:02 a 0:07, por que importa: uma linha.
- Corpo: uma ideia por cena, com troca de quadro a cada cena.
- Últimos 3 segundos: entregar o que o gancho prometeu e um único pedido.
- A última fala repete uma palavra do gancho.
- Sem abertura ("oi, tudo bem", "neste vídeo"). Use número, nunca adjetivo vago.
- Indique cada cena com o tempo e a fala, em linhas separadas.`,
  story: `Tarefa: sequência de 3 a 7 quadros de Story.
- Quadro 1: algo acontecendo hoje, com um rosto ou uma mão na imagem.
- Quadros 2 e 3: o conteúdo (o processo, o resultado ou um erro).
- Quadro 4: o pedido, com um adesivo só (enquete, caixa de pergunta, quiz ou link).
- Quadro final: a resposta, ou o que vem amanhã.
- Fale com uma pessoa só ("você"). Texto no meio da tela.
- Para cada quadro: o texto na tela e o adesivo usado, se houver.`,
  repurpose: `Tarefa: transformar o texto longo colado pela pessoa em uma semana de posts.
- Antes de escrever, extraia afirmações, números, histórias, mecanismos, erros e frases prontas. Conte cada tipo e coloque a contagem em "notas".
- Se o material render menos de 4 itens, diga em "notas" que ele é fraco.
- Monte 5 posts. Cada um precisa se sustentar sozinho: quem lê não viu o original. Não escreva "como eu disse no vídeo".
- Para cada post: formato (Reel, carrossel ou Story), um gancho diferente dos outros e o texto pronto.
- Ordem da semana: a afirmação mais forte primeiro, a história no meio, o mecanismo por último.`,
  comentario: `Tarefa: um comentário para publicar em um post de OUTRA conta. A pessoa colou a legenda desse post.
- Uma ou duas frases, com uma opinião real sobre o que a legenda diz.
- Sem autopromoção, sem link, sem "ótimo post!" e sem emoji sozinho.
- Se a legenda colada não der o que comentar, escreva um comentário curto e diga em "notas" que ela é fraca para comentário.`
};

const TIPOS = Object.keys(REGRAS);
const TAMANHO_MAX_PEDIDO = 2000;

class ErroEscrita extends Error {
  constructor(mensagem, status = 400) {
    super(mensagem);
    this.status = status;
  }
}

// Gera um texto a partir do pedido da pessoa. Lança ErroEscrita (com status) ou ErroIA.
async function gerar({ tipo, pedido, apiKey, env, f }) {
  if (!TIPOS.includes(tipo)) throw new ErroEscrita(`Escolha um tipo: ${TIPOS.join(', ')}.`, 400);
  const texto = String(pedido || '').trim();
  if (!texto) throw new ErroEscrita('Descreva o que você quer postar.', 400);
  if (texto.length > TAMANHO_MAX_PEDIDO) throw new ErroEscrita(`O pedido passa de ${TAMANHO_MAX_PEDIDO} caracteres.`, 400);

  const r = await chamarIA({ apiKey, env, f, sistema: `${BASE}\n\n${REGRAS[tipo]}`, usuario: `Pedido:\n${texto}` });
  let obj;
  try {
    obj = JSON.parse(r.texto);
  } catch (e) {
    throw new ErroEscrita('A IA devolveu uma resposta que não consegui ler. Tente de novo.', 502);
  }
  const limpo = humano.limpar(String(obj.texto || ''));
  const avisos = [...humano.avisos(limpo), ...(tipo === 'legenda' ? humano.avisosLegenda(limpo) : [])];
  return {
    texto: limpo,
    notas: Array.isArray(obj.notas) ? obj.notas.map(String).slice(0, 6) : [],
    avisos,
    modelo: r.modelo
  };
}

module.exports = { gerar, TIPOS, REGRAS, ErroEscrita };
