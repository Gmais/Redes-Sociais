// Análise das Redes Sociais: gerador de DADOS DE DEMONSTRAÇÃO (fictícios).
// Usado enquanto nenhuma conta está conectada à Meta. Os números não são métricas reais:
// o painel mostra um aviso "MODO DEMONSTRAÇÃO" em todas as seções que os usam.
//
// Determinístico: o mesmo dia sempre gera os mesmos números, então trocar o período não
// muda os valores de um dia que já apareceu. Sem rede, sem Supabase: lógica pura.
// Usado pelo navegador (window.AnaliseDemo) e pelos testes em Node (module.exports).

(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AnaliseDemo = api;
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var ANCORA = '2025-01-01';      // início da história demo; a partir daqui o seguidor total acumula
  var SEGUIDORES_INICIAIS = 1200;
  var DIA = 86400000;
  var DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  // Fator de dia da semana: fim de semana e sexta rendem um pouco mais.
  var PESO_DIA = [0.86, 1.0, 1.02, 1.0, 1.05, 1.12, 1.16];

  function diaEpoch(ds) {
    var p = ds.split('-').map(Number);
    return Math.floor(Date.UTC(p[0], p[1] - 1, p[2]) / DIA);
  }
  function dsDe(ep) { return new Date(ep * DIA).toISOString().slice(0, 10); }
  function addDays(ds, n) { return dsDe(diaEpoch(ds) + n); }
  function diasEntre(ini, fim) { return diaEpoch(fim) - diaEpoch(ini) + 1; }
  function diaSemana(ds) { return new Date(diaEpoch(ds) * DIA).getUTCDay(); }

  // Gerador pseudoaleatório pequeno e determinístico (mulberry32).
  function aleatorio(semente) {
    var a = semente >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  // Valor em [0, 1) fixo para (chave, canal): cada métrica tem seu próprio canal.
  function sorteio(chave, canal) {
    return aleatorio((Math.imul(chave, 2654435761) ^ Math.imul(canal, 40503)) >>> 0)();
  }

  // Métricas de um dia. k = dias desde a ANCORA (a conta cresce devagar ao longo do tempo).
  function metricasDoDia(ep, k) {
    var wk = PESO_DIA[new Date(ep * DIA).getUTCDay()];
    var alcance = Math.round((900 + 0.6 * Math.max(k, 0)) * wk * (0.75 + 0.5 * sorteio(ep, 1)));
    var impressoes = Math.round(alcance * (1.25 + 0.25 * sorteio(ep, 2)));
    var engajamento = Math.round(alcance * (0.035 + 0.025 * sorteio(ep, 3)));
    var visitas = Math.round(alcance * (0.025 + 0.015 * sorteio(ep, 4)));
    var cliques = Math.round(visitas * (0.08 + 0.10 * sorteio(ep, 5)));
    var ganhos = Math.round(alcance * (0.003 + 0.004 * sorteio(ep, 6)));
    var perdidos = Math.round(alcance * (0.001 + 0.0015 * sorteio(ep, 7)));
    return { alcance: alcance, impressoes: impressoes, engajamento: engajamento, visitas: visitas,
      cliques: cliques, ganhos: ganhos, perdidos: perdidos };
  }

  // Série diária de ini a fim (inclusive). O seguidor total parte da ANCORA e soma ganhos - perdidos.
  function serie(ini, fim) {
    var epAnc = diaEpoch(ANCORA), epIni = diaEpoch(ini), epFim = diaEpoch(fim);
    var seguidores = SEGUIDORES_INICIAIS, out = [];
    for (var ep = epAnc; ep <= epFim; ep++) {
      var m = metricasDoDia(ep, ep - epAnc);
      seguidores += m.ganhos - m.perdidos;
      if (ep >= epIni) out.push(Object.assign({ data: dsDe(ep), seguidores: seguidores }, m));
    }
    return out;
  }

  function totais(arr) {
    var t = { alcance: 0, impressoes: 0, engajamento: 0, visitas: 0, cliques: 0, ganhos: 0, perdidos: 0 };
    arr.forEach(function (d) { Object.keys(t).forEach(function (k) { t[k] += d[k]; }); });
    return t;
  }

  // Período atual (ini..fim) e o período anterior de mesmo tamanho, logo antes dele.
  function comparar(ini, fim) {
    var dias = diasEntre(ini, fim);
    var antFim = addDays(ini, -1);
    var antIni = addDays(antFim, -(dias - 1));
    var todas = serie(antIni, fim);
    var atual = todas.filter(function (d) { return d.data >= ini; });
    var anterior = todas.filter(function (d) { return d.data <= antFim; });
    return {
      ini: ini, fim: fim, dias: dias,
      antIni: antIni, antFim: antFim,
      comparavel: antIni >= ANCORA,
      serie: atual,
      totais: totais(atual),
      anteriorTotais: totais(anterior),
      seguidoresFim: atual.length ? atual[atual.length - 1].seguidores : null
    };
  }

  // Variação percentual; null quando não há base para comparar.
  function variacao(atual, anterior) {
    if (!anterior) return null;
    return (atual - anterior) / anterior * 100;
  }

  // Público demonstrativo: fixo, percentuais somam 100.
  var FAIXAS_IDADE = [['13–17', 4], ['18–24', 22], ['25–34', 34], ['35–44', 21], ['45–54', 12], ['55+', 7]];
  var GENERO = [['Feminino', 61], ['Masculino', 37], ['Não informado', 2]];
  var CIDADES = [['Cidade A', 24], ['Cidade B', 15], ['Cidade C', 11], ['Cidade D', 8], ['Cidade E', 6], ['Cidade F', 5], ['Outras', 31]];
  function publico() {
    function par(lista) { return lista.map(function (x) { return { rotulo: x[0], pct: x[1] }; }); }
    return { idade: par(FAIXAS_IDADE), genero: par(GENERO), cidades: par(CIDADES) };
  }

  // Mapa de calor demonstrativo: 7 dias x 24 horas, intensidade de 0 a 1.
  // Picos: manhã (7–9h), almoço (12–13h) e noite (18–21h); fim de semana de manhã forte.
  function mapaDeCalor() {
    var m = [];
    for (var d = 0; d < 7; d++) {
      var linha = [];
      for (var h = 0; h < 24; h++) {
        var pico = 0.15;
        if (h >= 7 && h <= 9) pico = 0.55;
        if (h >= 12 && h <= 13) pico = 0.7;
        if (h >= 18 && h <= 21) pico = 0.9;
        if (h === 22) pico = 0.6;
        if ((d === 0 || d === 6) && h >= 9 && h <= 12) pico = Math.max(pico, 0.75);
        var ruido = sorteio(d * 24 + h, 9) * 0.25 - 0.1;
        linha.push(Math.max(0, pico + ruido));
      }
      m.push(linha);
    }
    // Normaliza pelo maior valor: o pico vira 1 e os horários não empatam por corte.
    var max = 0;
    m.forEach(function (l) { l.forEach(function (v) { if (v > max) max = v; }); });
    return m.map(function (l) { return l.map(function (v) { return v / max; }); });
  }

  // Os n melhores slots (dia e hora) do mapa.
  function melhoresHorarios(m, n) {
    var lista = [];
    m.forEach(function (linha, d) {
      linha.forEach(function (v, h) { lista.push({ dia: DIAS_SEMANA[d], hora: h, valor: v }); });
    });
    lista.sort(function (a, b) { return b.valor - a.valor; });
    return lista.slice(0, n);
  }

  return {
    ANCORA: ANCORA,
    DIAS_SEMANA: DIAS_SEMANA,
    addDays: addDays,
    diasEntre: diasEntre,
    diaSemana: diaSemana,
    serie: serie,
    totais: totais,
    comparar: comparar,
    variacao: variacao,
    publico: publico,
    mapaDeCalor: mapaDeCalor,
    melhoresHorarios: melhoresHorarios
  };
}));
