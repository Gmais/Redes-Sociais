// Programação de postagens que se repetem (ex.: "Promoção" toda segunda).
// Lógica pura: feriados, datas e a ordem das opções. Sem rede e sem DOM.
// Usado pelo painel (index.html) e pelos testes (test/programacao.test.js).
//
// Regra das opções: a 1ª postagem usa a 1ª opção, a 2ª usa a 2ª, e assim por diante,
// voltando para a 1ª depois da última. Com 1 opção, sempre a mesma; com 2, alterna;
// com 3, segue o ciclo 1-2-3-1-2-3, uma por semana.
(function (raiz) {
  'use strict';

  // Prefixos dos IDs de card, lidos pela restauração do painel (ac = Academia, so = Sorveteria, gy = GympulsePro)
  const PREFIXO = { academia: 'ac', sorveteria: 'so', gympulse: 'gy' };

  const pad = (n) => String(n).padStart(2, '0');
  const iso = (ano, mes, dia) => `${ano}-${pad(mes)}-${pad(dia)}`;

  // Data ISO deslocada em dias (usa UTC para não depender do fuso da máquina)
  function deslocar(dataIso, dias) {
    const [a, m, d] = dataIso.split('-').map(Number);
    const x = new Date(Date.UTC(a, m - 1, d + dias));
    return iso(x.getUTCFullYear(), x.getUTCMonth() + 1, x.getUTCDate());
  }

  // Dia da semana: 0 = domingo ... 6 = sábado
  function diaSemana(dataIso) {
    const [a, m, d] = dataIso.split('-').map(Number);
    return new Date(Date.UTC(a, m - 1, d)).getUTCDay();
  }

  // Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher, calendário gregoriano)
  function pascoa(ano) {
    const a = ano % 19;
    const b = Math.floor(ano / 100);
    const c = ano % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (((32 + 2 * e + 2 * i - h - k) % 7) + 7) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const mes = Math.floor((h + l - 7 * m + 114) / 31);
    const dia = ((h + l - 7 * m + 114) % 31) + 1;
    return { mes, dia };
  }

  // Feriados nacionais e pontos facultativos do ano (lista fixa + datas que mudam com a Páscoa)
  function feriadosNacionais(ano) {
    const fixos = [
      [1, 1, 'Confraternização universal'], [4, 21, 'Tiradentes'], [5, 1, 'Dia do trabalho'],
      [9, 7, 'Independência'], [10, 12, 'Nossa Senhora Aparecida'], [11, 2, 'Finados'],
      [11, 15, 'Proclamação da República'], [11, 20, 'Consciência Negra'], [12, 25, 'Natal']
    ].map(([m, d, nome]) => ({ data: iso(ano, m, d), nome }));
    const p = pascoa(ano);
    const pascoaIso = iso(ano, p.mes, p.dia);
    const moveis = [
      [-48, 'Carnaval (segunda, ponto facultativo)'],
      [-47, 'Carnaval (terça, ponto facultativo)'],
      [-2, 'Sexta-feira Santa'],
      [60, 'Corpus Christi (ponto facultativo)']
    ].map(([delta, nome]) => ({ data: deslocar(pascoaIso, delta), nome }));
    return fixos.concat(moveis);
  }

  // Nome do feriado (ou do dia extra informado) se a data for um dia a pular; senão null
  function ehFeriado(dataIso, extras) {
    const ano = Number(dataIso.slice(0, 4));
    const nacional = feriadosNacionais(ano).find((f) => f.data === dataIso);
    if (nacional) return nacional.nome;
    if (Array.isArray(extras) && extras.includes(dataIso)) return 'Dia sem postagem (informado por você)';
    return null;
  }

  // Dias seguidos a partir de hoje, incluindo hoje
  function proximasDatas(hojeIso, dias) {
    const out = [];
    for (let i = 0; i < dias; i++) out.push(deslocar(hojeIso, i));
    return out;
  }

  // Opção da vez: a ordem se repete. Sem opções, nada.
  function escolherPelaOrdem(variantes, indice) {
    const lista = Array.isArray(variantes) ? variantes : [];
    if (!lista.length) return null;
    return lista[indice % lista.length];
  }

  // Quais posts criar para uma regra nas próximas datas. Não repete data já gerada.
  // O contador "proximo" guarda a posição da próxima opção, e continua de uma geração para a outra.
  // Devolve a regra atualizada (gerados e proximo) e a lista de posts novos.
  function planejarRegra(regra, hojeIso, dias, extras) {
    const r = Object.assign({}, regra, {
      gerados: Object.assign({}, regra.gerados || {}),
      proximo: Number(regra.proximo) || 0
    });
    const novos = [];
    if (!r.ativa || !Array.isArray(r.variantes) || !r.variantes.length) return { regra: r, novos };
    const prefixo = PREFIXO[r.empresa];
    if (!prefixo) return { regra: r, novos };
    for (const data of proximasDatas(hojeIso, dias)) {
      if (!(r.dias || []).includes(diaSemana(data))) continue;
      if (r.gerados[data]) continue;
      if (r.pularFeriados && ehFeriado(data, extras)) continue;
      const variante = escolherPelaOrdem(r.variantes, r.proximo);
      r.proximo += 1;
      const cardId = `${prefixo}_prog_${r.id}_${data.replace(/-/g, '')}`;
      r.gerados[data] = cardId;
      novos.push({ data, variante, cardId });
    }
    return { regra: r, novos };
  }

  const api = {
    PREFIXO, iso, deslocar, diaSemana, pascoa, feriadosNacionais, ehFeriado,
    proximasDatas, escolherPelaOrdem, planejarRegra
  };
  raiz.Programacao = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
