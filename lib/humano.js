'use strict';
// Checagem de texto (skill ig-human), em JavaScript, para texto em português.
// É heurística: não promete passar em detector nenhum. Troca só o que tem substituição clara
// (travessão, aspas curvas, caracteres invisíveis e algumas expressões) e aponta o resto para a pessoa reescrever.

const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const maiuscula = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// Universais (valem em qualquer idioma).
const INVISIVEIS = /[­​-‏⁠﻿]/g;
const TROCAS_TIPOGRAFIA = [
  ['—', ', '], ['–', '-'],
  ['‘', "'"], ['’', "'"],
  ['“', '"'], ['”', '"'],
  ['…', '...']
];

// Expressões típicas de texto gerado por IA, em português. Com "troca", a troca é automática;
// sem troca, só aparece como aviso. Revise esta lista conforme o seu jeito de escrever.
const EXPRESSOES = [
  { find: 'no mundo de hoje', replace: 'hoje' },
  { find: 'no cenário atual', replace: 'hoje' },
  { find: 'vale ressaltar', replace: 'vale dizer' },
  { find: 'em suma', replace: 'resumindo' },
  { find: 'mergulhar', replace: '' },
  { find: 'desvendar', replace: '' },
  { find: 'jornada', replace: '' },
  { find: 'tapeçaria', replace: '' },
  { find: 'elevar o nível', replace: '' },
  { find: 'é fundamental', replace: '' },
  { find: 'é importante ressaltar', replace: '' },
  { find: 'de forma geral', replace: '' },
  { find: 'sem dúvida', replace: '' },
  { find: 'um verdadeiro', replace: '' },
  { find: 'navegar', replace: '' }
];

// Estruturas que a própria skill aponta (só aviso, nunca troca automática).
const ESTRUTURAS = [
  { nome: '"Não é só X, é Y"', re: /\bnão é (?:só|apenas) [^.!?\n]{2,60}[,.] é(?=\s|$)/i, dica: 'Diga a coisa que você quer dizer. Apague a metade que só prepara.' },
  { nome: '"Não só X, mas também Y"', re: /\bnão (?:só|apenas) [^.!?\n]{2,80}\bmas também\b/i, dica: 'Separe em duas frases, ou apague a metade mais fraca.' },
  { nome: '"Não é sobre X. É sobre Y."', re: /\bnão é sobre [^.!?\n]{2,60}[.!] é sobre\b/i, dica: 'Comece pelo Y. A virada é o sinal de texto gerado.' },
  { nome: '"Aqui está o que"', re: /\baqui está o que\b/i, dica: 'Diga direto o que é.' },
  { nome: '"Neste vídeo"', re: /\bneste (?:vídeo|post|carrossel)\b/i, dica: 'Comece pelo conteúdo, sem anunciar o formato.' }
];

// Caracteres invisíveis somem; travessão e aspas viram o equivalente simples.
function limpar(texto) {
  let t = String(texto || '').replace(INVISIVEIS, '');
  for (const [de, para] of TROCAS_TIPOGRAFIA) t = t.split(de).join(para);
  const trocas = EXPRESSOES.filter((x) => x.replace).sort((a, b) => b.find.length - a.find.length);
  for (const x of trocas) {
    const re = new RegExp(`(?<![\\p{L}\\p{N}])${escapar(x.find)}(?![\\p{L}\\p{N}])`, 'giu');
    t = t.replace(re, (achado) => (achado[0] !== achado[0].toLowerCase() ? maiuscula(x.replace) : x.replace));
  }
  return t.replace(/[ \t]{2,}/g, ' ').replace(/ +([,.!?;:])/g, '$1').replace(/^ +| +$/gm, '');
}

// Avisos sobre o que sobrou no texto (depois de limpar).
function avisos(texto) {
  const t = String(texto || '');
  const out = [];
  for (const x of EXPRESSOES.filter((e) => !e.replace)) {
    const re = new RegExp(`(?<![\\p{L}\\p{N}])${escapar(x.find)}(?![\\p{L}\\p{N}])`, 'iu');
    if (re.test(t)) out.push({ tipo: 'expressão', trecho: x.find, dica: 'Reescreva com uma frase sua. Esta expressão aparece muito em texto gerado por IA.' });
  }
  for (const e of ESTRUTURAS) {
    if (e.re.test(t)) out.push({ tipo: 'estrutura', trecho: e.nome, dica: e.dica });
  }
  if (/[—–]/.test(t)) out.push({ tipo: 'travessão', trecho: '—', dica: 'Use vírgula, ponto ou hífen.' });
  return out;
}

// Regras da legenda (skill ig-caption): link, hashtags, tamanho e a primeira linha.
function avisosLegenda(texto) {
  const t = String(texto || '');
  const out = [];
  const primeira = (t.split('\n')[0] || '').trim();
  if (/https?:\/\/|www\.|\.(?:com|br|io|net)\b/i.test(t)) {
    out.push({ tipo: 'legenda', trecho: 'link', dica: 'Legenda não é clicável. Tire o link e leve a pessoa para a bio ou para a DM.' });
  }
  const hashtags = (t.match(/#[\p{L}\p{N}_]+/gu) || []).length;
  if (hashtags > 5) out.push({ tipo: 'legenda', trecho: `${hashtags} hashtags`, dica: 'O Instagram limita a 5 hashtags por post.' });
  if (t.length > 2200) out.push({ tipo: 'legenda', trecho: `${t.length} caracteres`, dica: 'O limite é 2.200 caracteres.' });
  if (primeira.length > 125) out.push({ tipo: 'legenda', trecho: 'primeira linha', dica: 'Só ~125 caracteres aparecem antes do "mais". Encurte o gancho.' });
  if (/^(oi|olá|ola|bom dia|boa tarde|boa noite)\b/i.test(primeira)) {
    out.push({ tipo: 'legenda', trecho: primeira.slice(0, 30), dica: 'Sem saudação na primeira linha: ela aparece antes do corte.' });
  }
  return out;
}

module.exports = { limpar, avisos, avisosLegenda };
