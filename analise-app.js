// Análise por empresa — aplicação: sessão, organizações, dados (com cache), modo Conteúdo/Análise e casca.
// Cada aba de empresa (Academia, Sorveteria, GympulsePro) tem o painel #pa-<empresa> para o modo Análise.
// As telas de cada aba interna ficam em analise-paginas.js. Os números vêm sempre das rotas /api/analise.
// Nomes com prefixo pz/PZ para não colidir com o resto do painel.

const PZ = {
  sb: null,
  sessao: null,
  iniciado: false,
  orgs: [],
  orgsCarregadas: false,
  org: null,
  empresa: 'academia',
  sub: {},
  periodo: { tipo: '30', ini: '', fim: '' },
  metrica: 'alcance',
  filtroPub: { tipo: '', ordem: 'data' },
  contaPor: {},
  token: 0,
  cache: {},
  voo: {},
  charts: {},
  rel: { tipo: 'semanal', ini: '', fim: '', conta: '', relatorio: null, csv: null, empresa: null, org: null },
  ia: { conta: '', ver: null, gerando: false }
};

const PZ_CHAVE_ORG = 'an_org_ativa';
const PZ_EMPRESAS = [
  { id: 'academia', nome: 'Academia', cor: '#FF5A36', ini: 'A' },
  { id: 'sorveteria', nome: 'Sorveteria', cor: '#F5B400', ini: 'S' },
  { id: 'gympulse', nome: 'GympulsePro', cor: '#6D4AFF', ini: 'G' }
];
const PZ_SUBS = [
  ['visao', 'Visão geral'], ['publico', 'Público'], ['publicacoes', 'Análise'], ['horarios', 'Melhores horários'],
  ['concorrentes', 'Concorrentes'], ['relatorios', 'Relatórios'], ['ia', 'Inteligência'], ['publicar', 'Publicar']
];
const PZ_NIVEL = { viewer: 0, editor: 1, admin: 2, owner: 3 };
// Destinos antigos (botões de ação das telas) para as abas atuais.
const PZ_ALIAS_SUB = { conexoes: 'contas', resumo: 'visao' };

const pzEmpresaAtual = () => PZ_EMPRESAS.find((e) => e.id === PZ.empresa) || PZ_EMPRESAS[0];
const pzSubAtual = () => PZ.sub[PZ.empresa] || 'visao';

function pzEsc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function pzAviso(tipo, titulo, texto) {
  return `<div class="pz-aviso ${tipo}"><div><b>${pzEsc(titulo)}</b>${pzEsc(texto)}</div></div>`;
}

function pzVazio(ico, titulo, texto, acao) {
  return `<div class="pz-vazio"><div class="pz-vazio-ico" aria-hidden="true">${ico}</div><h3>${pzEsc(titulo)}</h3><p>${pzEsc(texto)}</p>${acao || ''}</div>`;
}

let pzToastTimer = null;
function pzToast(texto, erro) {
  let el = document.getElementById('pz-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'pz-toast';
    el.className = 'pz-toast oculto';
    el.setAttribute('role', 'status');
    document.body.appendChild(el);
  }
  el.textContent = texto;
  el.className = 'pz-toast' + (erro ? ' erro' : '');
  clearTimeout(pzToastTimer);
  pzToastTimer = setTimeout(() => { el.className = 'pz-toast oculto'; }, 4800);
}

// ── Permissões ───────────────────────────────────────────────────────────────
function pzPapel() {
  const o = PZ.orgs.find((x) => x.id === PZ.org);
  return o ? o.papel : null;
}
function pzPode(minimo) {
  const p = pzPapel();
  return p != null && PZ_NIVEL[p] >= PZ_NIVEL[minimo];
}

// ── Período ──────────────────────────────────────────────────────────────────
// Até 90 dias fecha em hoje (o servidor limita aos dados completos, até ontem). Personalizado usa as datas escolhidas.
function pzPeriodo() {
  const hoje = todayBR();
  if (PZ.periodo.tipo === 'custom' && PZ.periodo.ini && PZ.periodo.fim) {
    const dias = Math.round((Date.parse(PZ.periodo.fim) - Date.parse(PZ.periodo.ini)) / 86400000) + 1;
    return { ini: PZ.periodo.ini, fim: PZ.periodo.fim, dias };
  }
  const dias = Number(PZ.periodo.tipo) || 30;
  return { ini: AnaliseDemo.addDays(hoje, -(dias - 1)), fim: hoje, dias };
}

// ── Dados: rotas com cache curto e sem busca duplicada ────────────────────────
async function pzApi(acao, opts = {}) {
  const metodo = opts.corpo !== undefined ? 'POST' : 'GET';
  const qs = new URLSearchParams({ acao });
  Object.entries(opts.query || {}).forEach(([k, v]) => { if (v !== '' && v != null) qs.set(k, v); });
  const cabecalhos = { Authorization: 'Bearer ' + PZ.sessao.access_token };
  let corpo;
  if (metodo === 'GET') {
    if (!qs.has('org')) qs.set('org', PZ.org);
  } else {
    cabecalhos['Content-Type'] = 'application/json';
    corpo = JSON.stringify({ orgId: PZ.org, ...(opts.corpo || {}) });
  }
  try {
    const r = await fetch('/api/analise?' + qs.toString(), { method: metodo, headers: cabecalhos, body: corpo });
    const dados = await r.json().catch(() => ({}));
    return r.ok ? { ok: true, dados } : { ok: false, erro: dados.error || 'Não foi possível concluir. Tente de novo.', dados };
  } catch (e) {
    return { ok: false, erro: 'Falha de conexão. Tente de novo.', dados: {} };
  }
}

// Pedidos iguais enquanto um ainda anda compartilham a mesma resposta. Só sucesso fica no cache.
async function pzCache(chave, buscar, ttl = 60000) {
  const hit = PZ.cache[chave];
  if (hit && Date.now() - hit.t < ttl) return hit.v;
  if (PZ.voo[chave]) return PZ.voo[chave];
  const busca = (async () => {
    try {
      const v = await buscar();
      if (v && v.ok) PZ.cache[chave] = { t: Date.now(), v };
      return v;
    } finally {
      delete PZ.voo[chave];
    }
  })();
  PZ.voo[chave] = busca;
  return busca;
}
function pzLimparCache() { PZ.cache = {}; }

const pzContas = () => pzCache('contas:' + PZ.org, () => pzApi('contas'));
function pzMetricas(conta) {
  const p = pzPeriodo();
  return pzCache(`met:${PZ.org}:${p.ini}:${p.fim}:${conta || ''}`, () => pzApi('metricas', { query: { ini: p.ini, fim: p.fim, conta } }));
}
function pzPublicacoes(conta, tipo, ordem) {
  return pzCache(`pub:${PZ.org}:${conta || ''}:${tipo || ''}:${ordem || ''}`, () => pzApi('publicacoes', { query: { conta, tipo, ordem } }));
}
const pzConcorrentes = () => pzCache('conc:' + PZ.org, () => pzApi('concorrentes'), 30000);
const pzIAHist = () => pzCache('ia:' + PZ.org, () => pzApi('ia-historico'), 30000);

// Empresas: as contas ligadas a cada uma. A análise usa uma conta do Instagram por empresa.
const pzContasDaEmpresa = (dados, id) => (dados.accounts || []).filter((c) => c.empresa === id);
const pzIgDaEmpresa = (dados, id) => pzContasDaEmpresa(dados, id).filter((c) => c.platform === 'instagram');
function pzContaDaEmpresa(dados, id) {
  const ig = pzIgDaEmpresa(dados, id);
  const escolhida = ig.find((c) => c.id === PZ.contaPor[id]);
  return escolhida ? escolhida.id : (ig[0] ? ig[0].id : '');
}
const pzNomeConta = (c) => (c.username ? '@' + c.username : (c.display_name || c.external_id || 'conta'));
// Última sincronização entre todas as contas (para o indicador do cabeçalho).
function pzUltimaSincronizacao() {
  const hit = PZ.cache['contas:' + PZ.org];
  if (!hit || !hit.v.dados) return null;
  const datas = (hit.v.dados.accounts || []).map((c) => c.last_synced_at).filter(Boolean).map((d) => Date.parse(d));
  return datas.length ? new Date(Math.max(...datas)).toISOString() : null;
}

// ── Sessão e organizações ────────────────────────────────────────────────────
async function pzIniciar() {
  if (typeof window.supabase === 'undefined') {
    PZ.iniciado = true;
    pzTela(pzAviso('erro', 'Login indisponível', 'Não foi possível carregar o login agora. Recarregue a página.'));
    return;
  }
  if (!PZ.sb) {
    PZ.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    PZ.sb.auth.onAuthStateChange((_evento, sessao) => {
      PZ.sessao = sessao;
      pzCarregarOrgs().then(pzRender);
    });
  }
  const { data } = await PZ.sb.auth.getSession();
  PZ.sessao = data.session;
  await pzCarregarOrgs();
  PZ.iniciado = true;
  pzRender();
}

async function pzCarregarOrgs() {
  PZ.orgs = [];
  PZ.orgsCarregadas = false;
  if (!PZ.sessao) { PZ.org = null; PZ.orgsCarregadas = true; return; }
  const { data, error } = await PZ.sb.from('organization_members').select('role, organization_id, organizations(name)');
  if (error) {
    PZ.erroOrgs = error.message;
    PZ.orgsCarregadas = true;
    return;
  }
  PZ.orgs = (data || []).map((m) => ({ id: m.organization_id, nome: m.organizations ? m.organizations.name : '—', papel: m.role }));
  let lembrada = null;
  try { lembrada = localStorage.getItem(PZ_CHAVE_ORG); } catch (e) { /* navegador sem armazenamento */ }
  PZ.org = PZ.orgs.some((o) => o.id === lembrada) ? lembrada : (PZ.orgs[0] ? PZ.orgs[0].id : null);
  PZ.orgsCarregadas = true;
}

function pzTrocarOrg(id) {
  PZ.org = id;
  try { localStorage.setItem(PZ_CHAVE_ORG, id); } catch (e) { /* vale só nesta aba */ }
  pzLimparCache();
  pzRender();
}

async function pzEnviarLink(ev) {
  ev.preventDefault();
  const email = document.getElementById('pz-email').value.trim();
  const msg = document.getElementById('pz-login-msg');
  const { error } = await PZ.sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + '/?analise=1' } });
  if (msg) {
    msg.textContent = error ? 'Não foi possível enviar o link: ' + error.message : 'Link enviado. Abra o e-mail neste mesmo navegador.';
    msg.style.color = error ? '#B42318' : '#067647';
  }
}

async function pzCriarOrg(ev) {
  ev.preventDefault();
  const nome = document.getElementById('pz-org-nome').value.trim();
  const { data, error } = await PZ.sb.rpc('create_organization', { p_name: nome });
  if (error) { pzToast('Não foi possível criar a organização: ' + error.message, true); return; }
  try { localStorage.setItem(PZ_CHAVE_ORG, data); } catch (e) { /* sem armazenamento */ }
  await pzCarregarOrgs();
  pzToast('Organização criada.');
  pzRender();
}

async function pzSair() {
  if (PZ.sb) await PZ.sb.auth.signOut();
  PZ.sessao = null;
  PZ.orgs = [];
  PZ.org = null;
  pzLimparCache();
  try { localStorage.removeItem(PZ_CHAVE_ORG); } catch (e) { /* nada a limpar */ }
  pzRender();
}

// ── Abas de empresa: análise e conteúdo na mesma página, sem troca de modo ──
// Ao abrir uma empresa, o bloco da análise e o conteúdo ficam visíveis juntos; a análise carrega aqui.
function pzAplicarEmpresa(tab) {
  if (!PZ_EMPRESAS.some((e) => e.id === tab)) return;
  PZ.empresa = tab;
  document.getElementById('p-' + tab)?.classList.add('on');
  document.getElementById('pa-' + tab)?.classList.add('on');
  if (!PZ.sb) pzIniciar();
  else pzRender();
}

// ── Casca da análise dentro da aba da empresa ────────────────────────────────
function pzTela(html) {
  pzGuardarConteudo();
  const el = document.getElementById('pa-' + PZ.empresa);
  if (el) el.innerHTML = html;
}

// Publicar: o conteúdo da empresa (calendário, posts e Modo Automático) fica guardado em #pz-guarda
// e só entra na tela dentro da subaba Publicar. Antes de cada desenho da análise, volta para a guarda.
function pzGuardarConteudo() {
  const guarda = document.getElementById('pz-guarda');
  if (!guarda) return;
  const filtro = document.getElementById('pz-filtro-conteudo');
  if (filtro && filtro.parentElement !== guarda) guarda.appendChild(filtro);
  PZ_EMPRESAS.forEach((e) => {
    const c = document.getElementById('p-' + e.id);
    if (!c) return;
    if (c.parentElement !== guarda) guarda.appendChild(c);
    c.classList.remove('on');
  });
}

function pzMostrarConteudo(slot) {
  if (!slot) return;
  const filtro = document.getElementById('pz-filtro-conteudo');
  if (filtro) slot.appendChild(filtro);
  const c = document.getElementById('p-' + PZ.empresa);
  if (c) { slot.appendChild(c); c.classList.add('on'); }
}

function pzSkeletonHtml() {
  return '<div class="pz"><div class="pz-skel" style="min-height:260px"></div></div>';
}

function pzRender() {
  if (!document.getElementById('pa-' + PZ.empresa)) return;
  pzDestruirGraficos();
  if (!PZ.iniciado) { pzTela(pzSkeletonHtml()); return; }
  if (!PZ.sessao) { pzTela(pzHtmlLogin()); return; }
  if (!PZ.orgsCarregadas) { pzTela(pzSkeletonHtml()); return; }
  if (!PZ.orgs.length) { pzTela(pzHtmlSemOrg()); return; }
  const emp = pzEmpresaAtual();
  const sub = pzSubAtual();
  if (sub === 'publicar') {
    pzTela(`<div class="pz" style="--c:${emp.cor}">${pzHtmlBarra(emp)}</div><div class="pz-publicar-slot"></div>`);
    pzMostrarConteudo(document.querySelector('#pa-' + PZ.empresa + ' .pz-publicar-slot'));
    return;
  }
  pzTela(`<div class="pz" style="--c:${emp.cor}">
    ${pzHtmlBarra(emp)}
    <div id="pz-pagina"></div>
  </div>`);
  pzDesenharEmpresa(emp.id, ++PZ.token, sub);
}

// Barra da empresa: as abas da análise e o período, numa linha só, sem cabeçalho separado.
function pzHtmlBarra(emp) {
  const sub = pzSubAtual();
  const nav = `<nav class="pz-sub" aria-label="Seções de ${pzEsc(emp.nome)}" role="tablist">${PZ_SUBS.map(([v, t]) =>
    `<button type="button" role="tab" aria-selected="${sub === v}" class="${sub === v ? 'on' : ''}" onclick="pzSubir('${v}')">${t}</button>`).join('')}</nav>`;
  const seg = [['7', '7 dias'], ['30', '30 dias'], ['90', '90 dias'], ['custom', 'Outro']]
    .map(([v, t]) => `<button type="button" class="${PZ.periodo.tipo === v ? 'on' : ''}" onclick="pzPeriodoSet('${v}')" aria-pressed="${PZ.periodo.tipo === v}">${t}</button>`).join('');
  const datas = PZ.periodo.tipo === 'custom'
    ? `<input type="date" class="pz-campo pequeno" id="pz-ini" value="${pzEsc(PZ.periodo.ini)}" aria-label="Data inicial">
       <input type="date" class="pz-campo pequeno" id="pz-fim" value="${pzEsc(PZ.periodo.fim)}" aria-label="Data final">
       <button type="button" class="pz-btn primario sm" onclick="pzAplicarPeriodo()">Aplicar</button>`
    : '';
  if (sub === 'publicar') return `<div class="pz-barra">${nav}</div>`;
  return `<div class="pz-barra">${nav}<div class="pz-barra-dir"><div class="pz-seg" role="group" aria-label="Período da análise">${seg}</div>${datas}</div></div>`;
}

function pzPeriodoSet(tipo) {
  if (tipo === 'custom') {
    const fim = PZ.periodo.fim || todayBR();
    const ini = PZ.periodo.ini || AnaliseDemo.addDays(todayBR(), -29);
    PZ.periodo = { tipo: 'custom', ini, fim };
  } else {
    PZ.periodo = { tipo, ini: '', fim: '' };
  }
  pzRender();
}

function pzAplicarPeriodo() {
  const ini = document.getElementById('pz-ini').value;
  const fim = document.getElementById('pz-fim').value;
  const hoje = todayBR();
  if (!ini || !fim) { pzToast('Escolha as duas datas.', true); return; }
  if (ini > fim) { pzToast('A data inicial é depois da final.', true); return; }
  if (fim > hoje) { pzToast('A data final não pode ser no futuro.', true); return; }
  PZ.periodo = { tipo: 'custom', ini, fim };
  pzRender();
}

// Troca de aba interna. Os destinos antigos (botões das telas) são convertidos.
function pzSubir(sub) {
  PZ.sub[PZ.empresa] = PZ_ALIAS_SUB[sub] || sub;
  pzRender();
}
const pzIr = (destino) => pzSubir(destino);

function pzDesenharEmpresa(id, tok, sub) {
  const el = document.getElementById('pz-pagina');
  if (!el) return;
  el.innerHTML = '<div class="pz-skel" style="min-height:220px"></div>';
  Promise.resolve()
    .then(() => pzPaginaEmpresa(el, id, sub, tok))
    .catch((e) => {
      console.error('análise:', e);
      el.innerHTML = pzAviso('erro', 'Algo não carregou', 'Tente de novo. Se continuar, recarregue a página.');
    });
}

// Gráficos: cada chamada destrói o anterior com o mesmo id.
function pzGrafico(id, cfg) {
  const el = document.getElementById(id);
  if (!el) return;
  if (typeof Chart === 'undefined') {
    el.parentElement.innerHTML = pzAviso('info', 'Gráfico indisponível', 'A biblioteca de gráficos não carregou. Recarregue a página.');
    return;
  }
  if (PZ.charts[id]) PZ.charts[id].destroy();
  PZ.charts[id] = new Chart(el, cfg);
}
function pzDestruirGraficos() {
  Object.values(PZ.charts).forEach((c) => { try { c.destroy(); } catch (e) { /* já destruído */ } });
  PZ.charts = {};
}

// Opções padrão dos gráficos: claros e sem poluição.
function pzOpcoes(extra = {}) {
  const base = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0F1222', titleColor: '#fff', bodyColor: '#E7E9F2', padding: 12, cornerRadius: 12, displayColors: false,
        callbacks: { label: (c) => ' ' + Number(c.parsed.y ?? c.parsed.x).toLocaleString('pt-BR') + (extra.sufixo || '') }
      }
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#8A90AB', maxTicksLimit: 8, autoSkip: true } },
      y: { beginAtZero: extra.zero !== false, grid: { color: 'rgba(15,18,34,.06)' }, border: { display: false }, ticks: { color: '#8A90AB', callback: (v) => Number(v).toLocaleString('pt-BR') } }
    }
  };
  if (extra.horizontal) base.indexAxis = 'y';
  return base;
}

// ── Telas de entrada (dentro do painel da empresa) ───────────────────────────
function pzHtmlLogin() {
  return `<div class="pz"><div class="pz-login"><div class="pz-login-card">
      <div class="pz-login-logo" aria-hidden="true">A</div>
      <h1>Análise das redes</h1>
      <p>Acompanhe o Instagram das suas empresas. Entre com seu e-mail: enviamos um link de acesso. Nenhuma senha de rede social é pedida.</p>
      <form class="pz-form" onsubmit="pzEnviarLink(event)">
        <label class="pz-rotulo">E-mail
          <input class="pz-campo" type="email" id="pz-email" required placeholder="voce@empresa.com" autocomplete="email">
        </label>
        <button class="pz-btn primario" type="submit">Enviar link de acesso</button>
      </form>
      <div class="pz-login-nota" id="pz-login-msg" role="status"></div>
    </div></div></div>`;
}

function pzHtmlSemOrg() {
  return `<div class="pz"><div class="pz-login"><div class="pz-login-card">
      <div class="pz-login-logo" aria-hidden="true">A</div>
      <h1>Crie a organização</h1>
      <p>Uma organização reúne as empresas e as contas. Você pode criar uma e convidar quem precisar depois.</p>
      <form class="pz-form" onsubmit="pzCriarOrg(event)">
        <label class="pz-rotulo">Nome da organização
          <input class="pz-campo" type="text" id="pz-org-nome" required minlength="2" maxlength="120" placeholder="Ex.: Grupo Gilson">
        </label>
        <button class="pz-btn primario" type="submit">Criar organização</button>
      </form>
      <div class="pz-login-nota"><button type="button" class="pz-btn fantasma sm" onclick="pzSair()">Sair</button></div>
    </div></div></div>`;
}

// ── Pontes com o painel (index.html chama estas funções) ─────────────────────
function anRender() { pzRender(); }
function anContaIniciar() { return pzIniciar(); }

// Volta da Meta (?analise=conectada|erro) ou do link de e-mail (?analise=1): abre a Academia em Análise, em Contas.
(function pzRetorno() {
  const p = new URLSearchParams(location.search);
  if (!p.has('analise')) return;
  const ERROS = {
    recusado: 'Você cancelou a autorização na Meta. Nada foi conectado.',
    estado: 'O link de conexão expirou ou é inválido. Tente de novo.',
    sem_permissao: 'Só owner ou admin podem conectar contas nesta organização.',
    sem_codigo: 'A Meta não devolveu a autorização. Tente de novo.',
    meta: 'A Meta não concluiu a conexão. Tente de novo em instantes.',
    tipo_conta: 'Essa conta do Instagram não é profissional. Mude para conta Business ou de Criador de conteúdo e tente de novo.',
    instagram: 'O Instagram não concluiu a conexão. Tente de novo em instantes.'
  };
  const finalizar = () => {
    PZ.empresa = 'academia';
    PZ.sub.academia = 'contas';
    const botao = document.querySelector('.tab[data-p="academia"]');
    if (botao && typeof go === 'function') go('academia', botao);
    if (p.get('analise') === 'conectada' && p.get('tipo') === 'ig') {
      pzToast('Conta do Instagram conectada pelo login direto.');
    } else if (p.get('analise') === 'conectada') {
      pzToast(`Conexão concluída: ${p.get('paginas') || 0} página(s) do Facebook e ${p.get('contas_ig') || 0} conta(s) de Instagram.`);
    } else if (p.get('analise') === 'erro') {
      pzToast(ERROS[p.get('motivo')] || 'Não foi possível concluir a conexão.', true);
    }
    // Só o ?analise sai da barra: o #fragmento com a sessão do e-mail precisa ficar para o Supabase ler.
    history.replaceState(null, '', location.pathname + location.hash);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', finalizar);
  else finalizar();
})();

// Abertura da página: a aba ativa é uma empresa, então a análise dela carrega junto com o conteúdo (sem passar por go()).
pzAplicarEmpresa(document.body.dataset.tab || 'academia');
