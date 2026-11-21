// Análise · Pulse — aplicação: sessão, organizações, dados (com cache), rotas e casca da tela.
// As páginas ficam em analise-paginas.js. Os números vêm sempre das rotas /api/analise, que conferem login e papel.
// Nomes com prefixo pz/PZ para não colidir com o resto do painel (index.html).

const PZ = {
  sb: null,
  sessao: null,
  iniciado: false,
  orgs: [],
  orgsCarregadas: false,
  org: null,
  pagina: 'resumo',
  sub: 'visao',
  periodo: { tipo: '30', ini: '', fim: '' },
  metrica: 'alcance',
  filtroPub: { tipo: '', ordem: 'data' },
  contaPor: {},
  token: 0,
  cache: {},
  charts: {},
  aviso: null
};

const PZ_CHAVE_ORG = 'an_org_ativa';
const PZ_EMPRESAS = [
  { id: 'academia', nome: 'Academia', cor: '#FF5A36', ini: 'A' },
  { id: 'sorveteria', nome: 'Sorveteria', cor: '#F5B400', ini: 'S' },
  { id: 'gympulse', nome: 'GympulsePro', cor: '#6D4AFF', ini: 'G' }
];
const PZ_NIVEL = { viewer: 0, editor: 1, admin: 2, owner: 3 };

const PZ_ICONES = {
  resumo: '<rect x="3" y="3" width="7" height="9" rx="2"/><rect x="14" y="3" width="7" height="5" rx="2"/><rect x="14" y="12" width="7" height="9" rx="2"/><rect x="3" y="16" width="7" height="5" rx="2"/>',
  concorrentes: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
  relatorios: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
  ia: '<path d="M12 3l2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2z"/>',
  conexoes: '<path d="M9 7V3M15 7V3M7 7h10v5a5 5 0 0 1-10 0z"/><path d="M12 17v4"/>',
  seta: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  seguranca: '<rect x="4" y="11" width="16" height="10" rx="3"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'
};

function pzIco(nome) {
  return `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PZ_ICONES[nome] || ''}</svg>`;
}

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

// ── Dados: rotas com cache curto (troca de página não refaz a consulta) ────────
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

async function pzCache(chave, buscar, ttl = 60000) {
  const hit = PZ.cache[chave];
  if (hit && Date.now() - hit.t < ttl) return hit.v;
  const v = await buscar();
  if (v && v.ok) PZ.cache[chave] = { t: Date.now(), v };
  return v;
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
function pzNomeConta(c) {
  return c.username ? '@' + c.username : (c.display_name || c.external_id || 'conta');
}
// Última sincronização entre todas as contas (para o indicador do topo).
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
    PZ.orgs = [];
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
  try { localStorage.setItem(PZ_CHAVE_ORG, id); } catch (e) { /* sem armazenamento: vale só nesta aba */ }
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

// ── Casca da tela ────────────────────────────────────────────────────────────
function pzTela(html) {
  const app = document.getElementById('an-app');
  if (app) app.innerHTML = html;
}

function pzRender() {
  if (!document.getElementById('an-app')) return;
  if (!PZ.iniciado) { pzTela('<div class="pz-page"><div class="pz-skel" style="min-height:260px"></div></div>'); return; }
  if (!PZ.sessao) { pzTela(pzHtmlLogin()); return; }
  if (!PZ.orgsCarregadas) { pzTela('<div class="pz-page"><div class="pz-skel" style="min-height:260px"></div></div>'); return; }
  if (!PZ.orgs.length) { pzTela(pzHtmlSemOrg()); return; }
  pzTela(`<div class="pz">${pzHtmlRail()}<div class="pz-main">${pzHtmlTopo()}<div class="pz-page" id="pz-page"></div></div></div>`);
  pzDesenharPagina();
}

function pzTituloPagina() {
  const emp = PZ_EMPRESAS.find((e) => e.id === PZ.pagina);
  if (emp) return emp.nome;
  return { resumo: 'Resumo', concorrentes: 'Concorrentes', relatorios: 'Relatórios', ia: 'Inteligência', conexoes: 'Conexões' }[PZ.pagina] || 'Resumo';
}

function pzHtmlRail() {
  const item = (id, nome, ico) => `<button type="button" class="pz-nav${PZ.pagina === id ? ' on' : ''}" onclick="pzIr('${id}')" ${PZ.pagina === id ? 'aria-current="page"' : ''}><span class="pz-ico">${pzIco(ico)}</span>${pzEsc(nome)}</button>`;
  const empresas = PZ_EMPRESAS.map((e) => {
    const semConta = PZ.cache['contas:' + PZ.org] && PZ.cache['contas:' + PZ.org].v.dados
      ? pzIgDaEmpresa(PZ.cache['contas:' + PZ.org].v.dados, e.id).length === 0 : false;
    return `<button type="button" class="pz-nav${PZ.pagina === e.id ? ' on' : ''}" onclick="pzIr('${e.id}')" ${PZ.pagina === e.id ? 'aria-current="page"' : ''}><span class="pz-empresa-ico" style="--c:${e.cor}">${e.ini}</span>${pzEsc(e.nome)}${semConta ? '<span class="pz-aviso-rail" title="Sem conta do Instagram">!</span>' : ''}</button>`;
  }).join('');
  return `<aside class="pz-rail" aria-label="Navegação da análise">
    <div class="pz-marca"><div class="pz-marca-logo" aria-hidden="true">A</div><div><b>Análise</b><small>Redes sociais</small></div></div>
    <div class="pz-rail-titulo">Visão</div>
    ${item('resumo', 'Resumo', 'resumo')}
    <div class="pz-rail-titulo">Empresas</div>
    ${empresas}
    <div class="pz-rail-titulo">Ferramentas</div>
    ${item('concorrentes', 'Concorrentes', 'concorrentes')}
    ${item('relatorios', 'Relatórios', 'relatorios')}
    ${item('ia', 'Inteligência', 'ia')}
    ${item('conexoes', 'Conexões', 'conexoes')}
  </aside>`;
}

function pzHtmlTopo() {
  const seg = [['7', '7 dias'], ['30', '30 dias'], ['90', '90 dias'], ['custom', 'Outro']]
    .map(([v, t]) => `<button type="button" class="${PZ.periodo.tipo === v ? 'on' : ''}" onclick="pzPeriodoSet('${v}')" aria-pressed="${PZ.periodo.tipo === v}">${t}</button>`).join('');
  const datas = PZ.periodo.tipo === 'custom'
    ? `<input type="date" class="pz-campo pequeno" id="pz-ini" value="${pzEsc(PZ.periodo.ini)}" aria-label="Data inicial">
       <input type="date" class="pz-campo pequeno" id="pz-fim" value="${pzEsc(PZ.periodo.fim)}" aria-label="Data final">
       <button type="button" class="pz-btn primario sm" onclick="pzAplicarPeriodo()">Aplicar</button>`
    : '';
  const ultima = pzUltimaSincronizacao();
  const sync = ultima
    ? `<span class="pz-pill ok" title="Última sincronização das contas">Sincronizado ${pzEsc(AnInsights.dataHora(ultima))}</span>`
    : '<span class="pz-pill warn">Sem sincronização ainda</span>';
  const inicial = pzEsc(((PZ.sessao && PZ.sessao.user && PZ.sessao.user.email) || '?').charAt(0).toUpperCase());
  return `<header class="pz-top">
    <div class="pz-titulo-mini">${pzEsc(pzTituloPagina())}</div>
    ${sync}
    <div class="pz-seg" role="group" aria-label="Período da análise">${seg}</div>
    ${datas}
    <div class="pz-usuario"><span class="pz-avatar" aria-hidden="true">${inicial}</span><button type="button" class="pz-btn fantasma sm" onclick="pzSair()">Sair</button></div>
  </header>`;
}

function pzPeriodoSet(tipo) {
  if (tipo === 'custom') {
    const p = pzPeriodo();
    PZ.periodo = { tipo: 'custom', ini: PZ.periodo.ini || AnaliseDemo.addDays(todayBR(), -29), fim: PZ.periodo.fim || todayBR() };
    if (!PZ.periodo.ini) PZ.periodo.ini = p.ini;
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

function pzIr(id, sub) {
  PZ.pagina = id;
  if (sub) PZ.sub = sub;
  else if (PZ_EMPRESAS.some((e) => e.id === id)) PZ.sub = 'visao';
  pzRender();
  const pag = document.getElementById('pz-page');
  if (pag) pag.scrollTop = 0;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function pzSubir(sub) {
  PZ.sub = sub;
  pzRender();
}

function pzDesenharPagina() {
  const el = document.getElementById('pz-page');
  if (!el) return;
  const tok = ++PZ.token;
  const p = PZ.pagina;
  const tarefa = PZ_EMPRESAS.some((e) => e.id === p) ? () => pzPaginaEmpresa(el, p, tok)
    : p === 'concorrentes' ? () => pzPaginaConcorrentes(el, tok)
    : p === 'relatorios' ? () => pzPaginaRelatorios(el, tok)
    : p === 'ia' ? () => pzPaginaIA(el, tok)
    : p === 'conexoes' ? () => pzPaginaConexoes(el, tok)
    : () => pzPaginaResumo(el, tok);
  Promise.resolve().then(tarefa).catch((e) => {
    console.error('análise:', e);
    el.innerHTML = pzAviso('erro', 'Algo não carregou', 'Tente de novo. Se continuar, recarregue a página.');
  });
}

// Gráficos: cada chamada destrói o anterior com o mesmo id (evita dois gráficos no mesmo canvas).
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

// Opções padrão dos gráficos: claros, sem poluição.
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

// ── Telas de entrada ─────────────────────────────────────────────────────────
function pzHtmlLogin() {
  return `<div class="pz" style="grid-template-columns:minmax(0,1fr)">
    <div class="pz-login"><div class="pz-login-card">
      <div class="pz-login-logo" aria-hidden="true">A</div>
      <h1>Análise das redes</h1>
      <p>Acompanhe o Instagram das suas empresas num só lugar. Entre com seu e-mail: enviamos um link de acesso. Nenhuma senha de rede social é pedida.</p>
      <form class="pz-form" onsubmit="pzEnviarLink(event)">
        <label class="pz-rotulo">E-mail
          <input class="pz-campo" type="email" id="pz-email" required placeholder="voce@empresa.com" autocomplete="email">
        </label>
        <button class="pz-btn primario" type="submit">Enviar link de acesso</button>
      </form>
      <div class="pz-login-nota" id="pz-login-msg" role="status"></div>
    </div></div>
  </div>`;
}

function pzHtmlSemOrg() {
  return `<div class="pz" style="grid-template-columns:minmax(0,1fr)">
    <div class="pz-login"><div class="pz-login-card">
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
    </div></div>
  </div>`;
}

// ── Pontes com o painel (index.html chama estas duas funções) ─────────────────
function anRender() { pzRender(); }
function anContaIniciar() { return pzIniciar(); }

// Volta da Meta (?analise=conectada|erro) ou do link de e-mail (?analise=1).
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
    PZ.pagina = 'conexoes';
    const botao = document.querySelector('.tab[data-p="analise"]');
    if (botao && typeof go === 'function') go('analise', botao);
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
