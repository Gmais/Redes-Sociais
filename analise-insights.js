// Cálculos puros do painel de Análise: formatação, variação, desenho de linhas em SVG e destaques.
// Sem rede e sem DOM. Os destaques são frases geradas dos números sincronizados (nada de estimativa).
(function (raiz) {
  const numeroValido = (n) => n != null && Number.isFinite(Number(n));

  const fmtInt = (n) => (numeroValido(n) ? Math.round(Number(n)).toLocaleString('pt-BR') : 'n/d');
  const fmtDec = (n, casas = 1) => (numeroValido(n)
    ? Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: casas })
    : 'n/d');
  const fmtSinal = (n, casas = 1) => (numeroValido(n) ? (n > 0 ? '+' : '') + fmtDec(n, casas) : 'n/d');

  // Variação em %, contra o período anterior. Sem base de comparação (ou base zero): null.
  function variacao(atual, anterior) {
    if (!numeroValido(atual) || !numeroValido(anterior) || Number(anterior) === 0) return null;
    return Math.round(((Number(atual) - Number(anterior)) / Number(anterior)) * 1000) / 10;
  }

  function tomDe(valor) {
    if (!numeroValido(valor) || valor === 0) return 'neutro';
    return valor > 0 ? 'alta' : 'queda';
  }

  // Média dos valores que existem. Nulo não conta como zero.
  function media(valores) {
    const v = valores.filter(numeroValido).map(Number);
    if (!v.length) return null;
    return Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10;
  }

  // Caminho SVG (atributo d) de uma linha. Valores nulos ficam de fora. Menos de 2 pontos: vazio.
  function caminhoLinha(valores, largura = 120, altura = 40, margem = 3) {
    const pontos = valores.map((v, i) => ({ i, v })).filter((p) => numeroValido(p.v));
    if (pontos.length < 2) return '';
    const numeros = pontos.map((p) => Number(p.v));
    const min = Math.min(...numeros);
    const max = Math.max(...numeros);
    const faixa = max - min || 1;
    const passo = valores.length > 1 ? valores.length - 1 : 1;
    return pontos.map((p, k) => {
      const x = margem + (p.i / passo) * (largura - margem * 2);
      const y = altura - margem - ((Number(p.v) - min) / faixa) * (altura - margem * 2);
      return (k ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
    }).join(' ');
  }

  const ROTULO_TIPO = { post: 'Posts', reel: 'Reels', video: 'Vídeos', carousel: 'Carrosséis', story: 'Stories', other: 'Outros' };

  // Por tipo de publicação: quantas, engajamento médio e alcance médio. Só entra o que foi medido.
  function resumoPorTipo(publicacoes) {
    const grupos = {};
    for (const p of publicacoes || []) (grupos[p.tipo] = grupos[p.tipo] || []).push(p);
    const saida = {};
    for (const [tipo, itens] of Object.entries(grupos)) {
      saida[tipo] = {
        quantidade: itens.length,
        engajamentoMedio: media(itens.map((p) => p.engajamento)),
        alcanceMedio: media(itens.map((p) => p.alcance))
      };
    }
    return saida;
  }

  // Publicações com a maior métrica escolhida (engajamento por padrão). Sem medição fica por último.
  function topPublicacoes(publicacoes, n = 3, campo = 'engajamento') {
    return (publicacoes || [])
      .slice()
      .sort((a, b) => {
        const va = numeroValido(a[campo]) ? Number(a[campo]) : -1;
        const vb = numeroValido(b[campo]) ? Number(b[campo]) : -1;
        return vb - va;
      })
      .slice(0, n);
  }

  // Destaques: frases factuais dos números do período. Sem IA e sem estimativa.
  function destaques({ totais = {}, anteriores = {}, publicacoes = [], horarios = null, saldoSeguidores = null, dias = 0 }) {
    const saida = [];
    const dAlcance = variacao(totais.alcance, anteriores.alcance);
    if (dAlcance != null) {
      saida.push({ tom: tomDe(dAlcance), titulo: 'Alcance', texto: `${fmtSinal(dAlcance)}% em relação aos ${dias} dias anteriores.` });
    }
    const tipos = Object.entries(resumoPorTipo(publicacoes))
      .filter(([, v]) => v.quantidade >= 2 && numeroValido(v.engajamentoMedio))
      .sort((a, b) => b[1].engajamentoMedio - a[1].engajamentoMedio);
    if (tipos.length >= 2) {
      const [tipo, v] = tipos[0];
      saida.push({
        tom: 'alta',
        titulo: 'Formato que mais rende',
        texto: `${ROTULO_TIPO[tipo] || tipo}: ${fmtDec(v.engajamentoMedio)} interações por publicação, a maior média entre os formatos com pelo menos 2 publicações.`
      });
    }
    if (horarios && horarios.suficiente && horarios.top && horarios.top[0]) {
      const t = horarios.top[0];
      saida.push({
        tom: 'alta',
        titulo: 'Melhor horário',
        texto: `${t.dia} às ${String(t.hora).padStart(2, '0')}h, com média de ${fmtDec(t.media)} interações.`
      });
    }
    if (numeroValido(saldoSeguidores)) {
      saida.push({ tom: tomDe(saldoSeguidores), titulo: 'Seguidores', texto: `${saldoSeguidores > 0 ? '+' : ''}${fmtInt(saldoSeguidores)} no período.` });
    }
    const dEngaj = variacao(totais.engajamento, anteriores.engajamento);
    if (dEngaj != null) {
      saida.push({ tom: tomDe(dEngaj), titulo: 'Engajamento', texto: `${fmtSinal(dEngaj)}% em relação aos ${dias} dias anteriores.` });
    }
    return saida.length
      ? saida.slice(0, 4)
      : [{ tom: 'neutro', titulo: 'Sem destaques ainda', texto: 'Quando houver dados sincronizados no período, os destaques aparecem aqui.' }];
  }

  // 'AAAA-MM-DD' -> 'dd/mm'
  const diaCurto = (ymd) => (ymd && ymd.length >= 10 ? ymd.slice(8, 10) + '/' + ymd.slice(5, 7) : 'n/d');

  // ISO -> 'dd/mm HH:MM' (Brasília)
  function dataHora(iso) {
    if (!iso) return 'n/d';
    const d = new Date(Date.parse(iso));
    if (!Number.isFinite(d.getTime())) return 'n/d';
    const br = new Date(d.getTime() - 3 * 3600 * 1000);
    const p = (n) => String(n).padStart(2, '0');
    return `${p(br.getUTCDate())}/${p(br.getUTCMonth() + 1)} ${p(br.getUTCHours())}:${p(br.getUTCMinutes())}`;
  }

  const api = {
    fmtInt, fmtDec, fmtSinal, variacao, tomDe, media, caminhoLinha,
    resumoPorTipo, topPublicacoes, destaques, diaCurto, dataHora, ROTULO_TIPO
  };
  raiz.AnInsights = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
