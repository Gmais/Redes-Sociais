// Análise · Pulse — páginas. Cada função desenha uma página no elemento dado.
// "tok" compara com PZ.token: se o usuário já trocou de página, a resposta antiga é descartada.

let pzSeq = 0;
const pzUid = () => 'pz' + (++pzSeq);
const fmtI = (v) => AnInsights.fmtInt(v);
const fmtD = (v, c) => AnInsights.fmtDec(v, c);

function pzSkeleton(el, altura = 260) {
  el.innerHTML = `<div class="pz-grid"><div class="pz-skel" style="grid-column:span 12;min-height:${altura}px"></div></div>`;
}

function pzCabecalho(titulo, texto, acoes = '') {
  return `<div class="pz-ph"><div><h1>${pzEsc(titulo)}</h1>${texto ? `<p>${pzEsc(texto)}</p>` : ''}</div><div class="pz-ph-acoes">${acoes}</div></div>`;
}

// Indicador (KPI) com variação contra o período anterior e linha de tendência.
function pzKpi(rotulo, valor, { delta = null, sufixo = '', serie = [], cor = '#6D4AFF', sub = '', s = 's3' } = {}) {
  const tom = delta == null ? '' : (delta > 0 ? 'alta' : (delta < 0 ? 'queda' : ''));
  const seta = delta == null ? '' : (delta > 0 ? '▲ ' : (delta < 0 ? '▼ ' : ''));
  const d = delta == null ? '<span class="pz-delta">sem comparação</span>' : `<span class="pz-delta ${tom}">${seta}${AnInsights.fmtSinal(delta)}%</span>`;
  const linha = AnInsights.caminhoLinha(serie, 240, 44, 2);
  const id = pzUid();
  const spark = linha
    ? `<svg class="pz-spark" viewBox="0 0 240 44" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${cor}" stop-opacity=".22"/><stop offset="1" stop-color="${cor}" stop-opacity="0"/></linearGradient></defs><path d="${linha} L240 44 L0 44 Z" fill="url(#${id})"/><path d="${linha}" fill="none" stroke="${cor}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/></svg>`
    : '';
  return `<div class="pz-card ${s}"><div class="pz-kpi">
    <div class="pz-kpi-topo"><span class="pz-kpi-lbl">${pzEsc(rotulo)}</span>${d}</div>
    <div class="pz-kpi-val">${valor}${sufixo ? `<small>${pzEsc(sufixo)}</small>` : ''}</div>
    ${sub ? `<div class="muted" style="font-size:12px">${sub}</div>` : ''}
    ${spark}
  </div></div>`;
}

// Barras horizontais com a maior do grupo como referência.
function pzRanking(itens, formatar = fmtI, sufixo = '') {
  const max = Math.max(0, ...itens.map((i) => Number(i.valor) || 0)) || 1;
  return `<div class="pz-ranking">${itens.map((i) => {
    const pct = Math.max(0, Number(i.valor) || 0) / max * 100;
    return `<div class="pz-rank"><span class="pz-rank-rot">${pzEsc(i.rotulo)}</span><span class="pz-rank-val">${formatar(i.valor)}${sufixo}</span><div class="pz-rank-trilho"><div class="pz-rank-barra" style="width:${pct.toFixed(1)}%"></div></div></div>`;
  }).join('')}</div>`;
}

function pzPostCard(p, maxEng) {
  const tipo = p.tipoLabel || 'Publicação';
  const capa = p.miniatura
    ? `<img src="${pzEsc(p.miniatura)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">`
    : `<span class="pz-tipo-capa">${pzEsc(tipo)}</span>`;
  const m = (rot, v) => `<div><b>${v == null ? 'n/d' : fmtI(v)}</b><span>${rot}</span></div>`;
  const barra = maxEng && p.engajamento != null
    ? `<div class="pz-rank-trilho" title="Engajamento desta publicação"><div class="pz-rank-barra" style="width:${(Math.max(0, p.engajamento) / maxEng * 100).toFixed(1)}%"></div></div>`
    : '';
  const link = /^https:\/\//.test(p.permalink || '') ? `<a class="pz-post-link" href="${pzEsc(p.permalink)}" target="_blank" rel="noopener noreferrer">Ver no Instagram ↗</a>` : '';
  return `<article class="pz-post">
    <div class="pz-post-capa">${capa}<span class="pz-pill roxo">${pzEsc(tipo)}</span></div>
    <div class="pz-post-corpo">
      <div class="pz-post-data">@${pzEsc(p.conta || '')} · ${AnInsights.dataHora(p.publicadoEm)}</div>
      <div class="pz-post-txt">${pzEsc(p.legenda || 'Sem legenda')}</div>
      ${barra}
      <div class="pz-post-m">${m('alcance', p.alcance)}${m('curtidas', p.curtidas)}${m('comentários', p.comentarios)}</div>
      ${link}
    </div>
  </article>`;
}

// Painel escuro com os destaques gerados dos números.
function pzHtmlDestaques(lista, titulo = 'Destaques do período', texto = 'Frases geradas dos números sincronizados. Nada é estimado.') {
  const itens = lista.map((d) => `<div class="pz-destaque ${d.tom === 'alta' ? 'alta' : (d.tom === 'queda' ? 'queda' : '')}">
      <span class="pz-tom"><i></i>${pzEsc(d.titulo)}</span>
      <b>${pzEsc(d.texto)}</b>
    </div>`).join('');
  return `<div class="pz-card pz-hero s12">
      <div class="pz-card-h"><div><h3>${pzEsc(titulo)}</h3><small>${pzEsc(texto)}</small></div></div>
      <div class="pz-destaques">${itens}</div>
    </div>`;
}

function pzSaudacao() {
  const h = (new Date().getUTCHours() - 3 + 24) % 24;
  return h < 12 ? 'Bom dia' : (h < 18 ? 'Boa tarde' : 'Boa noite');
}
function pzPrimeiroNome() {
  const e = (PZ.sessao && PZ.sessao.user && PZ.sessao.user.email) || '';
  const n = e.split('@')[0].split(/[._-]/)[0] || '';
  return n ? n.charAt(0).toUpperCase() + n.slice(1) : '';
}

// ── Resumo ───────────────────────────────────────────────────────────────────
async function pzPaginaResumo(el, tok) {
  pzSkeleton(el);
  const contas = await pzContas();
  if (tok !== PZ.token) return;
  if (!contas.ok) { el.innerHTML = pzAviso('erro', 'Não foi possível carregar as contas', contas.erro); return; }
  const dados = contas.dados;
  const metricas = await Promise.all(PZ_EMPRESAS.map((e) => {
    const conta = pzContaDaEmpresa(dados, e.id);
    return conta ? pzMetricas(conta) : Promise.resolve(null);
  }));
  if (tok !== PZ.token) return;
  pzDestruirGraficos();
  const p = pzPeriodo();
  const semIg = PZ_EMPRESAS.filter((e) => pzIgDaEmpresa(dados, e.id).length === 0);

  const cartoes = PZ_EMPRESAS.map((e, i) => {
    const m = metricas[i];
    const ok = m && m.ok ? m.dados : null;
    const conta = pzContaDaEmpresa(dados, e.id);
    const alcance = ok && ok.totais ? ok.totais.alcance : null;
    const seguidores = ok ? ok.seguidoresFim : null;
    const engajamento = ok && ok.totais ? ok.totais.engajamento : null;
    const contasDaEmpresa = pzContasDaEmpresa(dados, e.id);
    const sem = !conta;
    return `<article class="pz-card pz-empresa s4" style="--c:${e.cor}" onclick="pzIr('${e.id}')" tabindex="0" onkeydown="if(event.key==='Enter')pzIr('${e.id}')" aria-label="Abrir ${pzEsc(e.nome)}">
      <div class="pz-empresa-topo">
        <span class="pz-empresa-ico" style="--c:${e.cor}">${e.ini}</span>
        <div><h3>${pzEsc(e.nome)}</h3><small>${contasDaEmpresa.length} conta(s) ligada(s)</small></div>
      </div>
      ${sem
        ? '<span class="pz-pill warn">Sem conta do Instagram</span>'
        : `<div class="pz-empresa-num">
            <div><b>${alcance == null ? 'n/d' : fmtI(alcance)}</b><span>alcance no período</span></div>
            <div><b>${seguidores == null ? 'n/d' : fmtI(seguidores)}</b><span>seguidores</span></div>
            <div><b>${engajamento == null ? 'n/d' : fmtI(engajamento)}</b><span>engajamento</span></div>
            <div><b>${ok && ok.saldoSeguidores != null ? AnInsights.fmtSinal(ok.saldoSeguidores, 0) : 'n/d'}</b><span>saldo de seguidores</span></div>
          </div>`}
      <span class="pz-btn fantasma sm" style="align-self:flex-start">Abrir ${pzEsc(e.nome)} ${pzIco('seta')}</span>
    </article>`;
  }).join('');

  const alcanceTotal = metricas.reduce((s, m) => s + (m && m.ok && m.dados.totais && m.dados.totais.alcance != null ? m.dados.totais.alcance : 0), 0);
  const destaques = [];
  const comAlcance = PZ_EMPRESAS.map((e, i) => ({ e, a: metricas[i] && metricas[i].ok && metricas[i].dados.totais ? metricas[i].dados.totais.alcance : null }))
    .filter((x) => x.a != null).sort((a, b) => b.a - a.a);
  if (comAlcance.length) {
    destaques.push({ tom: 'neutro', titulo: 'Alcance somado', texto: `${fmtI(alcanceTotal)} pessoas alcançadas pelas empresas no período.` });
    if (comAlcance.length > 1) destaques.push({ tom: 'alta', titulo: 'Em destaque', texto: `${comAlcance[0].e.nome} lidera o alcance, com ${fmtI(comAlcance[0].a)}.` });
  }
  const ultimasIA = await pzIAHist();
  if (tok !== PZ.token) return;

  const atencao = [];
  (dados.accounts || []).filter((c) => !c.empresa).forEach((c) => atencao.push({ texto: `${pzNomeConta(c)} não está ligada a uma empresa.`, ico: 'info' }));
  (dados.accounts || []).filter((c) => c.status && c.status !== 'active').forEach((c) => atencao.push({ texto: `${pzNomeConta(c)} está ${c.status === 'expired' ? 'com a conexão expirada' : 'com erro'}.`, ico: 'erro' }));
  semIg.forEach((e) => atencao.push({ texto: `${e.nome} ainda não tem conta do Instagram.`, ico: 'info' }));
  const listaAtencao = atencao.length
    ? `<div class="pz-lista">${atencao.slice(0, 6).map((a) => `<div class="pz-item"><span class="pz-pill ${a.ico === 'erro' ? 'bad' : 'warn'}" style="min-width:0">${a.ico === 'erro' ? 'Erro' : 'Atenção'}</span><div class="pz-item-txt"><small>${pzEsc(a.texto)}</small></div></div>`).join('')}</div>`
    : '<div class="pz-aviso ok"><div><b>Tudo em ordem</b>Todas as contas estão ligadas a uma empresa e ativas.</div></div>';

  const concorrentes = contas.ok && pzPode('viewer') ? await pzConcorrentes() : null;
  if (tok !== PZ.token) return;
  const listaConc = concorrentes && concorrentes.ok && concorrentes.dados.concorrentes ? concorrentes.dados.concorrentes : [];
  const resumoConc = listaConc.length
    ? `<div class="pz-lista">${listaConc.slice(0, 4).map((c) => `<div class="pz-item"><div class="pz-item-txt"><b>@${pzEsc(c.handle)}</b><small>${c.ultimo ? `${fmtI(c.ultimo.seguidores)} seguidores · ${fmtI(c.ultimo.publicacoes30d)} publicações em 30 dias` : 'ainda sem consulta'}</small></div></div>`).join('')}</div>`
    : pzVazio('🎯', 'Nenhum concorrente', 'Cadastre perfis profissionais para comparar com as suas empresas.', '<button type="button" class="pz-btn fantasma" onclick="pzIr(\'concorrentes\')">Cadastrar concorrentes</button>');

  const ia = ultimasIA.ok ? (ultimasIA.dados.analises || []).find((a) => a.status === 'ok') : null;
  const cardIA = ia && ia.analise
    ? `<p style="font-weight:600;line-height:1.5">${pzEsc(ia.analise.resumo || '')}</p>
       <div class="muted" style="font-size:12px;margin-top:10px">Período ${AnInsights.diaCurto(ia.periodo.ini)} a ${AnInsights.diaCurto(ia.periodo.fim)} · ${AnInsights.dataHora(ia.criadaEm)}</div>
       <button type="button" class="pz-btn fantasma sm" style="margin-top:14px" onclick="pzIr('ia')">Ver análise completa</button>`
    : pzVazio('🧠', 'Nenhuma análise ainda', 'A análise com IA usa só números reais do período e diz o que falta quando faltam dados.', '<button type="button" class="pz-btn primario" onclick="pzIr(\'ia\')">Gerar análise</button>');

  el.innerHTML = `
    ${pzCabecalho(`${pzSaudacao()}${pzPrimeiroNome() ? ', ' + pzPrimeiroNome() : ''}`, `Período ${AnInsights.diaCurto(p.ini)} a ${AnInsights.diaCurto(p.fim)} · ${PZ_EMPRESAS.length} empresas. Escolha uma empresa para ver os detalhes.`)}
    <div class="pz-grid">
      ${cartoes}
      ${destaques.length ? pzHtmlDestaques(destaques, 'Visão da organização', 'Somas e comparações das empresas com conta do Instagram.') : ''}
      <div class="pz-card s4"><div class="pz-card-h"><div><h3>Atenção</h3><small>O que precisa de ajuste</small></div></div>${listaAtencao}</div>
      <div class="pz-card s4"><div class="pz-card-h"><div><h3>Concorrentes</h3><small>Dados públicos</small></div></div>${resumoConc}</div>
      <div class="pz-card s4"><div class="pz-card-h"><div><h3>Última análise com IA</h3><small>Só números reais</small></div></div>${cardIA}</div>
    </div>`;
}

// ── Empresa ──────────────────────────────────────────────────────────────────
const PZ_SUBS_EMPRESA = [['visao', 'Visão geral'], ['publico', 'Público'], ['publicacoes', 'Publicações'], ['horarios', 'Melhores horários'], ['contas', 'Contas']];

function pzCabecalhoEmpresa(emp, dados) {
  const contas = dados ? pzContasDaEmpresa(dados, emp.id) : [];
  return `<div class="pz-ph">
    <div style="display:flex;align-items:center;gap:14px">
      <span class="pz-empresa-ico" style="--c:${emp.cor};width:48px;height:48px;font-size:20px;border-radius:16px">${emp.ini}</span>
      <div><h1>${pzEsc(emp.nome)}</h1><p>${contas.length ? contas.length + ' conta(s) ligada(s) a esta empresa' : 'Nenhuma conta ligada ainda'}</p></div>
    </div>
    <div class="pz-ph-acoes"><button type="button" class="pz-btn fantasma sm" onclick="pzIr('conexoes')">Gerenciar contas</button></div>
  </div>`;
}

async function pzPaginaEmpresa(el, id, tok) {
  const emp = PZ_EMPRESAS.find((e) => e.id === id);
  pzSkeleton(el, 200);
  const contas = await pzContas();
  if (tok !== PZ.token) return;
  if (!contas.ok) { el.innerHTML = pzAviso('erro', 'Não foi possível carregar', contas.erro); return; }
  const dados = contas.dados;
  const ig = pzIgDaEmpresa(dados, id);
  const sub = PZ.sub || 'visao';
  pzDestruirGraficos();

  if (!ig.length) {
    const corpo = sub === 'contas'
      ? pzContasEmpresa(emp, dados)
      : pzVazio('📸', `${emp.nome} ainda não tem conta do Instagram`, 'Em Conexões, escolha a empresa da conta do Instagram. Depois disso, as análises desta empresa aparecem aqui.', '<button type="button" class="pz-btn primario" onclick="pzIr(\'conexoes\')">Ir para Conexões</button>');
    el.innerHTML = pzCabecalhoEmpresa(emp, dados) + (sub === 'contas' ? pzSubs(sub) : '') + corpo;
    return;
  }

  const conta = pzContaDaEmpresa(dados, id);
  PZ.contaPor[id] = conta;
  const seletor = ig.length > 1
    ? `<label class="pz-rotulo">Conta das análises
         <select class="pz-campo pequeno" onchange="pzTrocarContaEmpresa('${id}', this.value)">
           ${ig.map((c) => `<option value="${pzEsc(c.id)}"${c.id === conta ? ' selected' : ''}>${pzEsc(pzNomeConta(c))}</option>`).join('')}
         </select></label>`
    : `<span class="pz-pill roxo">${pzEsc(pzNomeConta(ig[0]))}</span>`;

  el.innerHTML = `${pzCabecalhoEmpresa(emp, dados)}
    <div class="pz-form" style="margin-bottom:16px;align-items:center;justify-content:space-between">${pzSubs(sub)}${seletor}</div>
    <div id="pz-corpo"></div>`;
  const alvo = document.getElementById('pz-corpo');

  if (sub === 'contas') { alvo.innerHTML = pzContasEmpresa(emp, dados); return; }

  if (sub === 'publicacoes') {
    const pubs = await pzPublicacoes(conta, PZ.filtroPub.tipo, PZ.filtroPub.ordem);
    if (tok !== PZ.token) return;
    alvo.innerHTML = pzHtmlPublicacoes(pubs);
    return;
  }

  const [metricas, pubsRes] = await Promise.all([pzMetricas(conta), pzPublicacoes(conta, '', 'data')]);
  if (tok !== PZ.token) return;
  if (!metricas.ok) { alvo.innerHTML = pzAviso('erro', 'Não foi possível carregar as métricas', metricas.erro); return; }
  const m = metricas.dados;
  const pubs = pubsRes.ok ? pubsRes.dados.publicacoes || [] : [];
  const sem = !(m.serie && m.serie.length);

  if (sem) {
    alvo.innerHTML = pzVazio('⏳', 'Sem métricas neste período', 'Ainda não há dados sincronizados para esta conta no período. Sincronize em Conexões ou escolha outro período.', '<button type="button" class="pz-btn primario" onclick="pzIr(\'conexoes\')">Ir para Conexões</button>');
    return;
  }

  if (sub === 'visao') alvo.innerHTML = pzHtmlVisao(m, pubs, tok);
  if (sub === 'publico') alvo.innerHTML = pzHtmlPublico(m, tok);
  if (sub === 'horarios') alvo.innerHTML = pzHtmlHorarios(m);
  pzDesenharGraficos(sub, m, pubs);
}

function pzSubs(sub) {
  return `<div class="pz-sub" role="tablist">${PZ_SUBS_EMPRESA.map(([v, t]) =>
    `<button type="button" role="tab" aria-selected="${sub === v}" class="${sub === v ? 'on' : ''}" onclick="pzSubir('${v}')">${t}</button>`).join('')}</div>`;
}

function pzTrocarContaEmpresa(id, conta) {
  PZ.contaPor[id] = conta;
  pzRender();
}

function pzContasEmpresa(emp, dados) {
  const contas = pzContasDaEmpresa(dados, emp.id);
  if (!contas.length) return pzVazio('🔌', 'Nenhuma conta ligada', 'Em Conexões, escolha a empresa de cada conta do Instagram e da Página do Facebook.', '<button type="button" class="pz-btn primario" onclick="pzIr(\'conexoes\')">Ir para Conexões</button>');
  return `<div class="pz-card s12"><div class="pz-card-h"><div><h3>Contas de ${pzEsc(emp.nome)}</h3><small>Mudar a empresa de uma conta é feito em Conexões.</small></div></div>
    <table class="pz-tabela"><thead><tr><th>Plataforma</th><th>Conta</th><th>Situação</th><th>Última sincronização</th></tr></thead><tbody>
    ${contas.map((c) => `<tr><td>${c.platform === 'instagram' ? 'Instagram' : 'Facebook'}</td><td><b>${pzEsc(pzNomeConta(c))}</b></td><td><span class="pz-pill ${c.status === 'active' ? 'ok' : 'bad'}">${c.status === 'active' ? 'Ativa' : pzEsc(c.status)}</span></td><td>${c.last_synced_at ? AnInsights.dataHora(c.last_synced_at) : 'nunca'}</td></tr>`).join('')}
    </tbody></table></div>`;
}

function pzHtmlVisao(m, pubs, tok) {
  const t = m.totais || {};
  const a = m.anteriores || {};
  const dias = m.dias || 0;
  const horarios = m.melhoresHorarios || null;
  const destaques = AnInsights.destaques({ totais: t, anteriores: a, publicacoes: pubs, horarios, saldoSeguidores: m.saldoSeguidores, dias });
  const metrica = PZ.metrica;
  const serie = m.serie || [];
  const por = (k) => serie.map((d) => d[k]);
  const opcoes = [['alcance', 'Alcance'], ['visualizacoes', 'Visualizações'], ['engajamento', 'Engajamento'], ['cliques', 'Cliques no link']];
  const topo = [
    pzHtmlDestaques(destaques),
    pzKpi('Alcance', fmtI(t.alcance), { delta: AnInsights.variacao(t.alcance, a.alcance), serie: por('alcance'), cor: '#6D4AFF' }),
    pzKpi('Visualizações', fmtI(t.visualizacoes), { delta: AnInsights.variacao(t.visualizacoes, a.visualizacoes), serie: por('visualizacoes'), cor: '#0EA5E9' }),
    pzKpi('Engajamento', fmtI(t.engajamento), { delta: AnInsights.variacao(t.engajamento, a.engajamento), serie: por('engajamento'), cor: '#FF5FA2' }),
    pzKpi('Seguidores', m.seguidoresFim == null ? 'n/d' : fmtI(m.seguidoresFim), { sub: m.saldoSeguidores == null ? 'saldo indisponível' : `saldo ${AnInsights.fmtSinal(m.saldoSeguidores, 0)} no período`, serie: por('seguidores'), cor: '#12B76A' })
  ].join('');

  const tipos = AnInsights.resumoPorTipo(pubs);
  const itensTipo = Object.entries(tipos).filter(([, v]) => v.engajamentoMedio != null)
    .sort((x, y) => y[1].engajamentoMedio - x[1].engajamentoMedio)
    .map(([k, v]) => ({ rotulo: `${AnInsights.ROTULO_TIPO[k] || k} (${v.quantidade})`, valor: v.engajamentoMedio }));
  const cardTipos = itensTipo.length
    ? pzRanking(itensTipo, (v) => fmtD(v), ' interações')
    : pzVazio('🖼️', 'Sem publicações medidas', 'Quando as publicações do período forem sincronizadas, a média por formato aparece aqui.');

  const cardHorarios = horarios && horarios.suficiente
    ? pzRanking(horarios.top.map((x) => ({ rotulo: `${x.dia} · ${String(x.hora).padStart(2, '0')}h`, valor: x.media })), (v) => fmtD(v), ' interações')
    : pzVazio('🕒', 'Horários ainda sem base', `Precisa de pelo menos 10 publicações com medição. Hoje há ${horarios ? horarios.posts : 0}.`);

  const seg = opcoes.map(([k, t]) => `<button type="button" class="${metrica === k ? 'on' : ''}" aria-pressed="${metrica === k}" onclick="pzMetricaSet('${k}')">${t}</button>`).join('');
  return `<div class="pz-grid">
    ${topo}
    <div class="pz-card s8">
      <div class="pz-card-h"><div><h3>Evolução</h3><small>${AnInsights.diaCurto(m.ini)} a ${AnInsights.diaCurto(m.fim)} · ${dias} dias</small></div>
        <div class="pz-seg" role="group" aria-label="Métrica do gráfico">${seg}</div></div>
      <div class="pz-chart alto"><canvas id="pz-ch-evo" role="img" aria-label="Evolução da métrica escolhida no período"></canvas></div>
    </div>
    <div class="pz-card s4">
      <div class="pz-card-h"><div><h3>Seguidores</h3><small>Total das contas, dia a dia</small></div></div>
      <div class="pz-chart alto"><canvas id="pz-ch-seg" role="img" aria-label="Seguidores ao longo do período"></canvas></div>
    </div>
    <div class="pz-card s5"><div class="pz-card-h"><div><h3>Formatos que rendem</h3><small>Média de interações por publicação</small></div></div>${cardTipos}</div>
    <div class="pz-card s7"><div class="pz-card-h"><div><h3>Melhores horários</h3><small>Horário de Brasília, com base nas suas publicações</small></div></div>${cardHorarios}</div>
    ${pubs.length ? `<div class="pz-card s12"><div class="pz-card-h"><div><h3>Publicações que mais engajaram</h3><small>Entre as publicações sincronizadas do período</small></div>
      <button type="button" class="pz-btn fantasma sm" onclick="pzSubir('publicacoes')">Ver todas</button></div>
      <div class="pz-posts">${AnInsights.topPublicacoes(pubs, 3).map((p) => pzPostCard(p, Math.max(...pubs.map((x) => x.engajamento || 0), 1))).join('')}</div></div>` : ''}
  </div>`;
}

function pzMetricaSet(k) {
  PZ.metrica = k;
  pzRender();
}

function pzHtmlPublico(m, tok) {
  const p = m.publico;
  if (!p) return pzVazio('👥', 'Público ainda não disponível', 'A Meta só informa a composição dos seguidores quando a conta tem 100 seguidores ou mais.');
  const generos = p.genero && p.genero.length ? p.genero : null;
  return `<div class="pz-grid">
    <div class="pz-card s6"><div class="pz-card-h"><div><h3>Faixa etária</h3><small>% dos seguidores · atualizado em ${AnInsights.diaCurto(p.snapshot)}</small></div></div>
      ${p.idade && p.idade.length ? pzRanking(p.idade.map((x) => ({ rotulo: x.rotulo, valor: x.pct })), (v) => fmtD(v), '%') : '<span class="muted">Sem dado</span>'}</div>
    <div class="pz-card s6"><div class="pz-card-h"><div><h3>Gênero</h3><small>% dos seguidores</small></div></div>
      ${generos ? `<div class="pz-chart baixo"><canvas id="pz-ch-gen" role="img" aria-label="Seguidores por gênero"></canvas></div>` : '<span class="muted">Sem dado</span>'}</div>
    <div class="pz-card s6"><div class="pz-card-h"><div><h3>Cidades</h3><small>As mais frequentes</small></div></div>
      ${p.cidades && p.cidades.length ? pzRanking(p.cidades.map((x) => ({ rotulo: x.rotulo, valor: x.pct })), (v) => fmtD(v), '%') : '<span class="muted">Sem dado</span>'}</div>
    <div class="pz-card s6"><div class="pz-card-h"><div><h3>Países</h3><small>Os mais frequentes</small></div></div>
      ${p.paises && p.paises.length ? pzRanking(p.paises.map((x) => ({ rotulo: x.rotulo, valor: x.pct })), (v) => fmtD(v), '%') : '<span class="muted">Sem dado</span>'}</div>
  </div>`;
}

function pzHtmlHorarios(m) {
  const h = m.melhoresHorarios;
  const suficiente = h && h.suficiente;
  return `<div class="pz-grid">
    <div class="pz-card s7"><div class="pz-card-h"><div><h3>Quando o público responde melhor</h3><small>Média de interações por horário (Brasília)</small></div></div>
      ${suficiente
        ? pzRanking(h.top.map((x) => ({ rotulo: `${x.dia} · ${String(x.hora).padStart(2, '0')}h (${x.posts} publicações)`, valor: x.media })), (v) => fmtD(v), ' interações')
        : pzVazio('🕒', 'Ainda sem base para ranking', `Precisa de pelo menos 10 publicações com medição. Hoje há ${h ? h.posts : 0}.`)}
    </div>
    <div class="pz-card s5"><div class="pz-card-h"><div><h3>Como ler</h3><small>Para usar no calendário de postagem</small></div></div>
      <div class="pz-lista">
        <div class="pz-item"><div class="pz-item-txt"><b>Use os primeiros horários</b><small>O topo da lista é a média mais alta do período.</small></div></div>
        <div class="pz-item"><div class="pz-item-txt"><b>Teste fora do topo</b><small>Publicar em outro horário ajuda a comparar e a confirmar o padrão.</small></div></div>
        <div class="pz-item"><div class="pz-item-txt"><b>Amostra pequena</b><small>Com poucas publicações, uma só pode mudar a ordem.</small></div></div>
      </div></div>
  </div>`;
}

function pzHtmlPublicacoes(res) {
  const tipos = [['', 'Todos'], ['post', 'Posts'], ['reel', 'Reels'], ['story', 'Stories'], ['carousel', 'Carrosséis'], ['video', 'Vídeos']];
  const ordens = [['data', 'Mais recentes'], ['alcance', 'Maior alcance'], ['visualizacoes', 'Mais visualizados'], ['engajamento', 'Maior engajamento']];
  const chips = tipos.map(([v, t]) => `<button type="button" class="pz-chipbtn ${PZ.filtroPub.tipo === v ? 'on' : ''}" onclick="pzFiltroPub('tipo','${v}')">${t}</button>`).join('');
  const ordem = `<label class="pz-rotulo" style="flex-direction:row;align-items:center;gap:8px">Ordenar
      <select class="pz-campo pequeno" onchange="pzFiltroPub('ordem', this.value)">${ordens.map(([v, t]) => `<option value="${v}"${PZ.filtroPub.ordem === v ? ' selected' : ''}>${t}</option>`).join('')}</select></label>`;
  const barra = `<div class="pz-card s12" style="padding:14px 16px"><div class="pz-form" style="align-items:center;justify-content:space-between"><div class="pz-chips">${chips}</div>${ordem}</div></div>`;
  if (!res.ok) return barra + pzAviso('erro', 'Não foi possível carregar as publicações', res.erro);
  const lista = res.dados.publicacoes || [];
  if (!lista.length) return barra + pzVazio('🖼️', 'Nenhuma publicação com estes filtros', 'Troque o tipo ou sincronize as contas em Conexões.');
  const max = Math.max(...lista.map((p) => p.engajamento || 0), 1);
  return barra + `<div class="pz-posts" style="margin-top:16px">${lista.slice(0, 60).map((p) => pzPostCard(p, max)).join('')}</div>
    <div class="muted" style="font-size:12px;margin-top:14px">Até 60 publicações mais recentes. A ordenação vale para estas publicações.</div>`;
}

function pzFiltroPub(campo, valor) {
  if (campo === 'tipo') PZ.filtroPub.tipo = valor;
  else PZ.filtroPub.ordem = valor;
  pzRender();
}

// Gráficos da página de empresa (depois que o HTML está no lugar).
function pzDesenharGraficos(sub, m, pubs) {
  const serie = m.serie || [];
  const labels = serie.map((d) => AnInsights.diaCurto(d.data));
  if (sub === 'visao') {
    const k = PZ.metrica;
    const cor = { alcance: '#6D4AFF', visualizacoes: '#0EA5E9', engajamento: '#FF5FA2', cliques: '#F59E0B' }[k] || '#6D4AFF';
    pzGrafico('pz-ch-evo', {
      type: 'line',
      data: { labels, datasets: [{ data: serie.map((d) => d[k]), borderColor: cor, borderWidth: 2.5, tension: 0.38, pointRadius: serie.length > 45 ? 0 : 3, pointHoverRadius: 6, fill: true,
        backgroundColor: (c) => { const g = c.chart.ctx.createLinearGradient(0, 0, 0, c.chart.height); g.addColorStop(0, cor + '44'); g.addColorStop(1, cor + '00'); return g; } }] },
      options: pzOpcoes()
    });
    pzGrafico('pz-ch-seg', {
      type: 'line',
      data: { labels, datasets: [{ data: serie.map((d) => d.seguidores), borderColor: '#12B76A', borderWidth: 2.5, tension: 0.35, pointRadius: 0, fill: true,
        backgroundColor: (c) => { const g = c.chart.ctx.createLinearGradient(0, 0, 0, c.chart.height); g.addColorStop(0, 'rgba(18,183,106,.28)'); g.addColorStop(1, 'rgba(18,183,106,0)'); return g; } }] },
      options: pzOpcoes({ zero: false })
    });
  }
  if (sub === 'publico' && m.publico && m.publico.genero && m.publico.genero.length) {
    pzGrafico('pz-ch-gen', {
      type: 'doughnut',
      data: { labels: m.publico.genero.map((x) => x.rotulo), datasets: [{ data: m.publico.genero.map((x) => x.pct), backgroundColor: ['#6D4AFF', '#FF5FA2', '#CBD0E0'], borderWidth: 0, hoverOffset: 6 }] },
      options: { responsive: true, maintainAspectRatio: false, cutout: '68%', plugins: { legend: { position: 'bottom', labels: { color: '#4A4F6A', usePointStyle: true, boxWidth: 8 } }, tooltip: { callbacks: { label: (c) => ' ' + c.label + ': ' + c.parsed + '%' } } } }
    });
  }
}

// ── Concorrentes ─────────────────────────────────────────────────────────────
async function pzPaginaConcorrentes(el, tok) {
  pzSkeleton(el, 200);
  const r = await pzConcorrentes();
  if (tok !== PZ.token) return;
  const acoes = pzPode('editor')
    ? `<button type="button" class="pz-btn fantasma" onclick="pzConcSincronizar()">Atualizar agora</button>` : '';
  const topo = pzCabecalho('Concorrentes', 'Dados públicos de contas profissionais. Atualizam todo dia, às 08h, e também pelo botão.', acoes);
  if (!r.ok) { el.innerHTML = topo + pzAviso('erro', 'Não foi possível carregar', r.erro); return; }
  const lista = r.dados.concorrentes || [];
  const form = pzPode('editor')
    ? `<div class="pz-card s12" style="margin-bottom:16px"><form class="pz-form" onsubmit="pzConcAdicionar(event)">
         <label class="pz-rotulo" style="flex:2 1 220px">Perfil do concorrente
           <input class="pz-campo" id="pz-conc-h" required maxlength="31" placeholder="@perfil" autocomplete="off"></label>
         <label class="pz-rotulo" style="flex:1 1 180px">Nome (opcional)
           <input class="pz-campo" id="pz-conc-n" maxlength="80" placeholder="Como você chama"></label>
         <button type="submit" class="pz-btn primario">Adicionar concorrente</button>
       </form><div class="muted" style="font-size:12px;margin-top:10px">Só entra quem é conta profissional (comercial ou criador) e pública. A Meta confirma antes de salvar.</div></div>`
    : '';
  const aviso = r.dados.avisoConsulta ? pzAviso('info', 'Consulta indisponível', r.dados.avisoConsulta) : '';
  const cartoes = lista.map((c) => {
    const u = c.ultimo;
    const hist = (c.historico || []).map((h) => h.seguidores);
    const linha = AnInsights.caminhoLinha(hist, 240, 44, 2);
    const tipos = u && u.tipos ? Object.entries(u.tipos).filter(([, n]) => n > 0)
      .map(([k, n]) => `<span class="pz-pill info">${pzEsc(AnInsights.ROTULO_TIPO[k] || k)} ${n}</span>`).join(' ') : '';
    return `<article class="pz-card s4 pz-empresa" style="--c:#14142B">
      <div class="pz-empresa-topo"><span class="pz-empresa-ico" style="--c:#14142B">${pzEsc((c.handle || '?').charAt(0).toUpperCase())}</span>
        <div><h3>@${pzEsc(c.handle)}</h3><small>${pzEsc(c.displayName || 'sem nome')}</small></div></div>
      ${u ? `<div class="pz-empresa-num">
          <div><b>${fmtI(u.seguidores)}</b><span>seguidores</span></div>
          <div><b>${fmtI(u.publicacoes30d)}</b><span>posts em 30 dias</span></div>
          <div><b>${u.engajamentoMedio == null ? 'n/d' : fmtD(u.engajamentoMedio)}</b><span>engajamento médio</span></div>
          <div><b>${fmtI(u.totalPublicacoes)}</b><span>posts no total</span></div>
        </div>
        ${linha ? `<svg class="pz-spark" viewBox="0 0 240 44" preserveAspectRatio="none" aria-hidden="true"><path d="${linha}" fill="none" stroke="#14142B" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>` : ''}
        ${tipos ? `<div class="pz-chips">${tipos}</div>` : ''}
        <div class="muted" style="font-size:12px">Atualizado ${AnInsights.dataHora(u.capturadoEm)}</div>`
        : '<span class="pz-pill warn">Ainda sem consulta</span>'}
      ${pzPode('editor') ? `<button type="button" class="pz-btn fantasma sm" style="align-self:flex-start" onclick="pzConcRemover('${c.id}','${pzEsc(c.handle)}')">Remover</button>` : ''}
    </article>`;
  }).join('');
  el.innerHTML = topo + aviso + form + (lista.length
    ? `<div class="pz-grid">${cartoes}</div>`
    : pzVazio('🎯', 'Nenhum concorrente cadastrado', 'Cadastre perfis de concorrentes para comparar alcance, frequência e engajamento com as suas empresas.'));
}

async function pzConcAdicionar(ev) {
  ev.preventDefault();
  const handle = document.getElementById('pz-conc-h').value;
  const displayName = document.getElementById('pz-conc-n').value;
  pzToast('Consultando o perfil na Meta…');
  const r = await pzApi('concorrentes-adicionar', { corpo: { handle, displayName } });
  if (!r.ok) { pzToast(r.erro, true); return; }
  pzLimparCache();
  pzToast(`@${r.dados.concorrente.handle} cadastrado.`);
  pzRender();
}

async function pzConcRemover(id, handle) {
  if (!confirm(`Remover @${handle}? O histórico dela também será apagado.`)) return;
  const r = await pzApi('concorrentes-remover', { corpo: { id } });
  if (!r.ok) { pzToast(r.erro, true); return; }
  pzLimparCache();
  pzToast(`@${handle} removido.`);
  pzRender();
}

async function pzConcSincronizar() {
  pzToast('Atualizando os concorrentes…');
  const r = await pzApi('concorrentes-sincronizar', { corpo: {} });
  if (!r.ok || !r.dados.ok) { pzToast(r.erro || r.dados.erro || 'Não foi possível atualizar.', true); return; }
  const falhas = (r.dados.resultados || []).filter((x) => !x.ok);
  pzLimparCache();
  pzToast(falhas.length ? falhas.map((x) => x.erro).join(' ') : 'Concorrentes atualizados.', falhas.length > 0);
  pzRender();
}

// ── Relatórios ───────────────────────────────────────────────────────────────
PZ.rel = { tipo: 'semanal', ini: '', fim: '', conta: '', relatorio: null, csv: null, org: null };

async function pzPaginaRelatorios(el, tok) {
  if (PZ.rel.org !== PZ.org) { PZ.rel.org = PZ.org; PZ.rel.relatorio = null; PZ.rel.csv = null; }
  const contas = await pzContas();
  if (tok !== PZ.token) return;
  const todas = contas.ok ? (contas.dados.accounts || []).filter((c) => c.platform === 'instagram') : [];
  const tipos = [['semanal', 'Semanal · 7 dias'], ['mensal', 'Mensal · mês anterior'], ['personalizado', 'Personalizado']];
  const datas = PZ.rel.tipo === 'personalizado'
    ? `<div class="pz-form"><label class="pz-rotulo">Início<input class="pz-campo" type="date" id="pz-rel-ini" value="${PZ.rel.ini}"></label>
       <label class="pz-rotulo">Fim<input class="pz-campo" type="date" id="pz-rel-fim" value="${PZ.rel.fim}"></label></div>` : '';
  const opcoes = ['<option value="">Todas as contas do Instagram</option>']
    .concat(todas.map((c) => `<option value="${pzEsc(c.id)}"${c.id === PZ.rel.conta ? ' selected' : ''}>${pzEsc(pzNomeConta(c))}</option>`)).join('');
  const config = `<div class="pz-card s4"><div class="pz-card-h"><div><h3>Montar relatório</h3><small>Lê só os dados sincronizados</small></div></div>
    <div class="pz-lista" style="gap:14px">
      <div class="pz-chips">${tipos.map(([v, t]) => `<button type="button" class="pz-chipbtn ${PZ.rel.tipo === v ? 'on' : ''}" onclick="pzRelTipo('${v}')">${t}</button>`).join('')}</div>
      ${datas}
      <label class="pz-rotulo">Conta<select class="pz-campo" id="pz-rel-conta">${opcoes}</select></label>
      <button type="button" class="pz-btn primario" id="pz-rel-gerar" onclick="pzGerarRelatorio()">Gerar relatório</button>
    </div></div>`;
  const acoes = PZ.rel.relatorio ? `<div class="pz-ph-acoes"><button type="button" class="pz-btn fantasma sm" onclick="pzBaixarCsv()">Baixar CSV</button><button type="button" class="pz-btn escuro sm" onclick="window.print()">Salvar como PDF</button></div>` : '';
  const saida = PZ.rel.relatorio
    ? `<div class="pz-card s8" style="padding:0;background:transparent;border:0;box-shadow:none">${acoes ? `<div style="margin-bottom:12px">${acoes}</div>` : ''}<div id="pz-folha" class="pz-folha">${pzHtmlRelatorio(PZ.rel.relatorio)}</div></div>`
    : `<div class="pz-card s8">${pzVazio('📄', 'Nenhum relatório gerado', 'Escolha o tipo de período e clique em Gerar relatório. O relatório traz os números, a comparação com o período anterior e o que a API não mostra.')}</div>`;
  el.innerHTML = pzCabecalho('Relatórios', 'Semanal, mensal ou personalizado, com exportação em CSV e PDF.') + `<div class="pz-grid">${config}${saida}</div>`;
}

function pzRelTipo(tipo) {
  PZ.rel.tipo = tipo;
  PZ.rel.relatorio = null;
  PZ.rel.csv = null;
  if (tipo === 'personalizado' && !PZ.rel.ini) {
    PZ.rel.fim = todayBR();
    PZ.rel.ini = AnaliseDemo.addDays(PZ.rel.fim, -29);
  }
  pzRender();
}

async function pzGerarRelatorio() {
  const conta = document.getElementById('pz-rel-conta').value;
  PZ.rel.conta = conta;
  const q = { tipo: PZ.rel.tipo, conta };
  if (PZ.rel.tipo === 'personalizado') {
    PZ.rel.ini = document.getElementById('pz-rel-ini').value;
    PZ.rel.fim = document.getElementById('pz-rel-fim').value;
    if (!PZ.rel.ini || !PZ.rel.fim) { pzToast('Escolha as duas datas.', true); return; }
    if (PZ.rel.ini > PZ.rel.fim) { pzToast('A data inicial é depois da final.', true); return; }
    q.ini = PZ.rel.ini;
    q.fim = PZ.rel.fim;
  }
  const botao = document.getElementById('pz-rel-gerar');
  if (botao) botao.disabled = true;
  const r = await pzApi('relatorio', { query: q });
  if (!r.ok) { pzToast(r.erro, true); if (botao) botao.disabled = false; return; }
  PZ.rel.relatorio = r.dados.relatorio;
  PZ.rel.csv = r.dados.csv;
  pzRender();
}

function pzBaixarCsv() {
  if (!PZ.rel.csv || !PZ.rel.relatorio) return;
  const blob = new Blob([PZ.rel.csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `relatorio-${PZ.rel.relatorio.tipo}-${PZ.rel.relatorio.periodo.ini}-${PZ.rel.relatorio.periodo.fim}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function pzHtmlRelatorio(r) {
  const n = (v) => (v == null ? 'n/d' : fmtI(v));
  const kpis = r.indicadores.map((i) => `<div><span>${pzEsc(i.rotulo)}</span><b>${n(i.valor)}</b><small>${i.variacao == null ? 'sem comparação' : AnInsights.fmtSinal(i.variacao) + '% vs anterior'}</small></div>`).join('')
    + `<div><span>Seguidores no fim</span><b>${n(r.seguidores.noFim)}</b><small>último valor sincronizado</small></div>`
    + `<div><span>Saldo de seguidores</span><b>${r.seguidores.saldo == null ? 'n/d' : AnInsights.fmtSinal(r.seguidores.saldo, 0)}</b><small>ganhos menos perdidos</small></div>`;
  const diario = r.diario.length
    ? `<h3>Dia a dia</h3><table><thead><tr><th>Data</th><th class="n">Alcance</th><th class="n">Visualizações</th><th class="n">Engajamento</th><th class="n">Cliques</th><th class="n">Seguidores</th></tr></thead><tbody>${r.diario.map((d) => `<tr><td>${AnInsights.diaCurto(d.data)}</td><td class="n">${n(d.alcance)}</td><td class="n">${n(d.visualizacoes)}</td><td class="n">${n(d.engajamento)}</td><td class="n">${n(d.cliques)}</td><td class="n">${n(d.seguidores)}</td></tr>`).join('')}</tbody></table>`
    : '';
  const pubs = r.publicacoes.length
    ? `<h3>Publicações no período (${r.publicacoes.length})</h3><table><thead><tr><th>Tipo</th><th>Data</th><th>Conta</th><th class="n">Alcance</th><th class="n">Curtidas</th><th class="n">Comentários</th><th class="n">Engajamento</th></tr></thead><tbody>${r.publicacoes.map((p) => `<tr><td>${pzEsc(p.tipo)}</td><td>${AnInsights.diaCurto(p.data)} ${String(p.hora).padStart(2, '0')}h</td><td>@${pzEsc(p.conta || '')}</td><td class="n">${n(p.alcance)}</td><td class="n">${n(p.curtidas)}</td><td class="n">${n(p.comentarios)}</td><td class="n">${n(p.engajamento)}</td></tr>`).join('')}</tbody></table>`
    : '';
  const conc = r.concorrentes.length
    ? `<h3>Concorrentes (dados públicos)</h3><table><thead><tr><th>Perfil</th><th class="n">Seguidores</th><th class="n">Posts em 30 dias</th><th class="n">Engajamento médio</th></tr></thead><tbody>${r.concorrentes.map((c) => `<tr><td>@${pzEsc(c.perfil)}</td><td class="n">${n(c.seguidores)}</td><td class="n">${n(c.publicacoes30d)}</td><td class="n">${c.engajamentoMedio == null ? 'n/d' : fmtD(c.engajamentoMedio)}</td></tr>`).join('')}</tbody></table>`
    : '';
  const lim = `<h3>Limitações e o que não aparece</h3><ul>${r.limitacoes.map((x) => `<li>${pzEsc(x)}</li>`).join('')}</ul>`;
  return `<h2>${pzEsc(r.titulo)}</h2>
    <div class="sub">Período ${AnInsights.diaCurto(r.periodo.ini)} a ${AnInsights.diaCurto(r.periodo.fim)} (${r.periodo.dias} dias) · anterior ${AnInsights.diaCurto(r.periodoAnterior.ini)} a ${AnInsights.diaCurto(r.periodoAnterior.fim)}</div>
    <div class="sub">Escopo: ${pzEsc(r.escopo)} · Gerado em ${AnInsights.dataHora(r.geradoEm)}</div>
    ${r.semDados ? '<div class="sub" style="color:#B42318;margin-top:8px">Sem dados sincronizados neste período. Os números aparecem como n/d.</div>' : ''}
    <h3>Indicadores</h3><div class="pz-kpis">${kpis}</div>
    ${diario}${pubs}${conc}${lim}`;
}

// ── Inteligência (análise com IA) ────────────────────────────────────────────
PZ.ia = { conta: '', gerando: false };

async function pzPaginaIA(el, tok) {
  pzSkeleton(el, 200);
  const [contas, hist] = await Promise.all([pzContas(), pzIAHist()]);
  if (tok !== PZ.token) return;
  const p = pzPeriodo();
  const todas = contas.ok ? (contas.dados.accounts || []).filter((c) => c.platform === 'instagram') : [];
  const podeGerar = pzPode('editor');
  const analises = hist.ok ? hist.dados.analises || [] : [];
  const atual = PZ.ia.ver ? analises.find((a) => a.id === PZ.ia.ver) : null;
  const mostrar = atual || analises[0] || null;

  const opcoes = ['<option value="">Todas as contas do Instagram</option>']
    .concat(todas.map((c) => `<option value="${pzEsc(c.id)}"${c.id === PZ.ia.conta ? ' selected' : ''}>${pzEsc(pzNomeConta(c))}</option>`)).join('');
  const painel = `<div class="pz-card s4">
      <div class="pz-card-h"><div><h3>Gerar análise</h3><small>Período ${AnInsights.diaCurto(p.ini)} a ${AnInsights.diaCurto(p.fim)}</small></div></div>
      <div class="pz-lista" style="gap:14px">
        <label class="pz-rotulo">Conta<select class="pz-campo" id="pz-ia-conta" onchange="pzIaConta(this.value)">${opcoes}</select></label>
        ${podeGerar
          ? `<button type="button" class="pz-btn primario" id="pz-ia-gerar" onclick="pzGerarIA()" ${PZ.ia.gerando ? 'disabled' : ''}>${PZ.ia.gerando ? 'Analisando…' : 'Gerar análise'}</button>`
          : '<div class="pz-aviso info"><div><b>Só leitura</b>Gerar uma análise é feito por editor ou mais. Você pode ler as análises já feitas.</div></div>'}
        <div class="muted" style="font-size:12px">A IA recebe números, médias por formato e horários. Não recebe legendas nem dados individuais de seguidores.</div>
      </div></div>`;
  const corpo = mostrar ? pzHtmlAnaliseIA(mostrar) : pzVazio('🧠', 'Nenhuma análise ainda', 'Escolha a conta ao lado e gere a primeira análise do período.');
  const historico = analises.length > 1
    ? `<div class="pz-card s12"><div class="pz-card-h"><div><h3>Histórico</h3><small>Análises anteriores</small></div></div>
       <div class="pz-chips">${analises.map((a) => `<button type="button" class="pz-chipbtn ${mostrar && a.id === mostrar.id ? 'on' : ''}" onclick="pzVerIA('${a.id}')">${AnInsights.diaCurto(a.periodo.ini)} a ${AnInsights.diaCurto(a.periodo.fim)} · ${a.status === 'ok' ? 'análise' : (a.status === 'insufficient_data' ? 'sem dados' : 'erro')} · ${AnInsights.dataHora(a.criadaEm)}</button>`).join('')}</div></div>`
    : '';
  el.innerHTML = pzCabecalho('Inteligência', 'Análises em linguagem simples, feitas só com os números sincronizados. Sem dado, a análise diz o que falta.') +
    `<div class="pz-grid">${painel}<div class="pz-card s8">${corpo}</div>${historico}</div>`;
}

function pzHtmlAnaliseIA(a) {
  const an = a.analise || {};
  const lista = (titulo, itens) => (itens && itens.length
    ? `<h4 style="margin:18px 0 6px;font-size:13px;color:var(--ink2)">${titulo}</h4><ul class="pz-ia-lista">${itens.map((x) => `<li>${pzEsc(x)}</li>`).join('')}</ul>`
    : '');
  const meta = `<div class="muted" style="font-size:12px">Período ${AnInsights.diaCurto(a.periodo.ini)} a ${AnInsights.diaCurto(a.periodo.fim)} · gerada ${AnInsights.dataHora(a.criadaEm)}${a.modelo ? ' · modelo ' + pzEsc(a.modelo) : ''}</div>`;
  if (a.status === 'insufficient_data' || a.status === 'error') {
    return `${meta}<h3 style="margin-top:10px;font-size:17px">${a.status === 'error' ? 'A análise não foi gerada' : 'Dados insuficientes para analisar'}</h3>${lista('O que faltou', an.limitacoes)}`;
  }
  return `${meta}<h3 style="margin-top:10px;font-size:17px">Resumo</h3><p style="margin-top:8px;font-size:15px;line-height:1.6">${pzEsc(an.resumo || '')}</p>
    ${lista('Pontos fortes', an.pontos_fortes)}${lista('Pontos de atenção', an.pontos_de_atencao)}${lista('Próximos passos', an.proximos_passos)}${lista('Limitações', an.limitacoes)}`;
}

function pzIaConta(conta) {
  PZ.ia.conta = conta;
}

function pzVerIA(id) {
  PZ.ia.ver = id;
  pzRender();
}

async function pzGerarIA() {
  const p = pzPeriodo();
  PZ.ia.gerando = true;
  pzRender();
  const r = await pzApi('ia-analisar', { corpo: { ini: p.ini, fim: p.fim, conta: PZ.ia.conta || undefined } });
  PZ.ia.gerando = false;
  if (!r.ok) { pzToast(r.erro, true); pzRender(); return; }
  pzLimparCache();
  PZ.ia.ver = r.dados.id || null;
  pzToast(r.dados.status === 'ok' ? 'Análise gerada.' : 'A análise não foi gerada. Veja o motivo.', r.dados.status !== 'ok');
  pzRender();
}

// ── Conexões ─────────────────────────────────────────────────────────────────
async function pzPaginaConexoes(el, tok) {
  pzSkeleton(el, 200);
  const [contas, cfg] = await Promise.all([pzContas(), pzApi('configuracoes')]);
  if (tok !== PZ.token) return;
  const podeConectar = pzPode('admin');
  const seletorOrg = PZ.orgs.length > 1
    ? `<label class="pz-rotulo">Organização<select class="pz-campo pequeno" onchange="pzTrocarOrg(this.value)">${PZ.orgs.map((o) => `<option value="${pzEsc(o.id)}"${o.id === PZ.org ? ' selected' : ''}>${pzEsc(o.nome)} (${pzEsc(o.papel)})</option>`).join('')}</select></label>`
    : `<span class="pz-pill roxo">${pzEsc(PZ.orgs.find((o) => o.id === PZ.org)?.nome || '')} · ${pzEsc(pzPapel() || '')}</span>`;
  const acoes = podeConectar
    ? `<button type="button" class="pz-btn primario" onclick="pzConectar('meta-iniciar')">Conectar Instagram / Facebook</button>
       <button type="button" class="pz-btn fantasma" onclick="pzConectar('ig-iniciar')">Conectar só o Instagram</button>
       <button type="button" class="pz-btn fantasma" onclick="pzImportarPortfolio()">Importar do portfólio</button>
       <button type="button" class="pz-btn escuro" onclick="pzSincronizar()">Sincronizar agora</button>`
    : '<span class="muted">Só owner ou admin conectam contas e sincronizam.</span>';
  const topo = pzCabecalho('Conexões', 'Contas do Instagram e Páginas do Facebook, a empresa de cada uma e a sincronização.', '');
  const lista = contas.ok ? (contas.dados.accounts || []) : [];
  const opcoesEmp = (atual) => ['<option value="">Sem empresa</option>'].concat(PZ_EMPRESAS.map((e) => `<option value="${e.id}"${atual === e.id ? ' selected' : ''}>${pzEsc(e.nome)}</option>`)).join('');
  const linhas = lista.map((c) => `<tr>
      <td><span class="pz-pill ${c.platform === 'instagram' ? 'roxo' : 'info'}">${c.platform === 'instagram' ? 'Instagram' : 'Facebook'}</span></td>
      <td><b>${pzEsc(pzNomeConta(c))}</b></td>
      <td>${podeConectar ? `<select class="pz-campo pequeno" aria-label="Empresa desta conta" onchange="pzDefinirEmpresa('${pzEsc(c.id)}', this.value)">${opcoesEmp(c.empresa)}</select>` : pzEsc((PZ_EMPRESAS.find((e) => e.id === c.empresa) || { nome: 'sem empresa' }).nome)}</td>
      <td><span class="pz-pill ${c.status === 'active' ? 'ok' : 'bad'}">${c.status === 'active' ? 'Ativa' : pzEsc(c.status)}</span></td>
      <td>${c.last_synced_at ? AnInsights.dataHora(c.last_synced_at) : 'nunca'}</td>
    </tr>`).join('');
  const tabela = lista.length
    ? `<table class="pz-tabela"><thead><tr><th>Tipo</th><th>Conta</th><th>Empresa</th><th>Situação</th><th>Última sincronização</th></tr></thead><tbody>${linhas}</tbody></table>`
    : pzVazio('🔌', 'Nenhuma conta conectada', 'Conecte o Instagram ou a Página do Facebook. Nenhuma senha de rede social é pedida: você entra no login oficial da Meta.');
  const auto = cfg.ok ? cfg.dados : null;
  const info = auto
    ? `<div class="pz-lista" style="gap:10px">
         <div class="pz-item"><div class="pz-item-txt"><b>Sincronização automática</b><small>${pzEsc(auto.automatica.horario)}${auto.automatica.ultimaEm ? ' · última: ' + AnInsights.dataHora(auto.automatica.ultimaEm) : ''}</small></div></div>
         <div class="pz-item"><div class="pz-item-txt"><b>Envio de relatórios por e-mail</b><small>Ainda não ligado: falta um serviço de envio e um remetente com domínio verificado. Os relatórios podem ser baixados.</small></div></div>
       </div>`
    : '';
  el.innerHTML = topo + `<div class="pz-grid">
    <div class="pz-card s12"><div class="pz-card-h"><div><h3>Organização e ações</h3><small>Quem administra a organização conecta e sincroniza</small></div>${seletorOrg}</div>
      <div class="pz-chips" style="gap:10px">${acoes}</div></div>
    <div class="pz-card s12"><div class="pz-card-h"><div><h3>Contas</h3><small>A empresa de cada conta decide em qual página ela aparece</small></div></div>${tabela}</div>
    <div class="pz-card s12"><div class="pz-card-h"><div><h3>Sincronização e envio</h3><small>Automática todo dia, e também pelo botão</small></div></div>${info}</div>
  </div>`;
}

async function pzConectar(acao) {
  const r = await pzApi(acao, { corpo: {} });
  if (!r.ok || !r.dados.url) { pzToast(r.erro || 'Não foi possível iniciar a conexão.', true); return; }
  window.location.href = r.dados.url;
}

async function pzImportarPortfolio() {
  pzToast('Importando as contas do portfólio…');
  const r = await pzApi('importar-portfolio', { corpo: {} });
  if (!r.ok) { pzToast(r.erro, true); return; }
  pzLimparCache();
  pzToast(`${r.dados.importadas} conta(s) importada(s) de ${r.dados.contas} encontrada(s).`);
  pzRender();
}

async function pzSincronizar() {
  pzToast('Sincronizando as contas… pode levar até um minuto.');
  const r = await pzApi('sincronizar', { corpo: {} });
  if (!r.ok) { pzToast(r.erro, true); return; }
  if (r.dados.aviso) { pzToast(r.dados.aviso); return; }
  const resultados = r.dados.resultados || [];
  const falhas = resultados.filter((x) => !x.ok);
  pzLimparCache();
  pzToast(resultados.map((x) => (!x.ok ? `@${x.conta}: ${x.erro}` : `@${x.conta}: ${x.registros} registros`)).join(' · ') || 'Nada para sincronizar.', falhas.length > 0);
  pzRender();
}

async function pzDefinirEmpresa(contaId, valor) {
  const r = await pzApi('contas-empresa', { corpo: { contaId, empresa: valor || null } });
  if (!r.ok) { pzToast(r.erro, true); pzRender(); return; }
  pzLimparCache();
  pzToast('Empresa salva.');
  pzRender();
}
