// Login com senha do painel. Publicar, cancelar e consultar posts na Zernio passam a exigir sessão
// quando o servidor estiver com EXIGIR_LOGIN_ZERNIO=1. A senha não fica salva no código: a sessão fica
// no navegador (Supabase). A recuperação de senha vai só para o e-mail que a pessoa digitar.
(function () {
  'use strict';

  // /api/auto-content: o "Gerar nova postagem" (acao tema) usa o mesmo login; o Modo Automático ignora o token.
  var ROTAS_PROTEGIDAS = ['/api/publish-zernio', '/api/zernio?acao=', '/api/auto-content'];
  var cliente = null;
  var botao = null;

  var ESTILO_CAMPO = 'width:100%;box-sizing:border-box;padding:9px 10px;border:1px solid #cfd4dc;border-radius:8px;font:inherit;font-size:14px;margin-top:4px;';
  var ESTILO_BOTAO = 'padding:9px 14px;border:0;border-radius:8px;background:#e63900;color:#fff;font:inherit;font-size:14px;font-weight:600;cursor:pointer;margin-right:6px;margin-top:12px;';
  var ESTILO_LINK = 'background:none;border:0;color:#2b5fd9;font:inherit;font-size:13px;cursor:pointer;padding:0;margin-top:12px;text-decoration:underline;';

  function sb() {
    if (cliente) return cliente;
    if (!window.supabase || typeof SUPABASE_URL === 'undefined') return null;
    cliente = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    cliente.auth.onAuthStateChange(function (evento) {
      if (evento === 'PASSWORD_RECOVERY') novaSenha();
      atualizarBotao();
    });
    return cliente;
  }

  function token() {
    var c = sb();
    if (!c) return Promise.resolve(null);
    return c.auth.getSession().then(function (r) {
      return r.data && r.data.session ? r.data.session.access_token : null;
    }, function () { return null; });
  }

  function atualizarBotao() {
    if (!botao) return;
    token().then(function (t) {
      botao.textContent = t ? 'Sair' : 'Entrar';
      botao.setAttribute('data-logado', t ? '1' : '0');
    });
  }

  // Anexa o token nas rotas protegidas. Se o servidor responder 401, abre a tela de login.
  var fetchNativo = window.fetch.bind(window);
  window.fetch = function (entrada, init) {
    var url = typeof entrada === 'string' ? entrada : '';
    var protegida = ROTAS_PROTEGIDAS.some(function (r) { return url.indexOf(r) === 0; });
    if (!protegida) return fetchNativo(entrada, init);
    return token().then(function (t) {
      var cabecalhos = new Headers((init && init.headers) || {});
      if (t) cabecalhos.set('Authorization', 'Bearer ' + t);
      return fetchNativo(entrada, Object.assign({}, init || {}, { headers: cabecalhos }));
    }).then(function (resp) {
      if (resp.status === 401) abrirLogin(url.indexOf('/api/auto-content') === 0 ? 'Entre para gerar postagens com IA.' : 'Entre para publicar no Instagram.');
      return resp;
    });
  };

  function abrir(titulo) {
    fechar();
    var fundo = document.createElement('div');
    fundo.id = 'painel-login-fundo';
    fundo.setAttribute('style', 'position:fixed;inset:0;background:rgba(15,23,42,.45);z-index:6000;display:flex;align-items:center;justify-content:center;padding:16px;');
    var caixa = document.createElement('div');
    caixa.setAttribute('style', 'background:#fff;color:#111827;border-radius:14px;padding:22px;width:100%;max-width:360px;box-shadow:0 12px 36px rgba(0,0,0,.25);font-size:14px;');
    caixa.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;">' +
      '<strong style="font-size:16px;">' + titulo + '</strong>' +
      '<button type="button" id="pl-fechar" aria-label="Fechar" style="background:none;border:0;font-size:18px;cursor:pointer;color:#6b7280;">✕</button></div>' +
      '<div id="pl-corpo" style="margin-top:12px;"></div>' +
      '<div id="pl-msg" style="margin-top:10px;font-size:13px;min-height:16px;"></div>';
    fundo.appendChild(caixa);
    document.body.appendChild(fundo);
    document.getElementById('pl-fechar').onclick = fechar;
    fundo.onclick = function (e) { if (e.target === fundo) fechar(); };
    return document.getElementById('pl-corpo');
  }

  function fechar() {
    var f = document.getElementById('painel-login-fundo');
    if (f) f.parentNode.removeChild(f);
  }

  function aviso(texto, erro) {
    var m = document.getElementById('pl-msg');
    if (!m) return;
    m.textContent = texto;
    m.style.color = erro ? '#b42318' : '#067647';
  }

  function campo(id, rotulo, tipo, autocompletar) {
    return '<label style="display:block;font-size:13px;color:#374151;margin-top:8px;">' + rotulo +
      '<input id="' + id + '" type="' + tipo + '" autocomplete="' + autocompletar + '" style="' + ESTILO_CAMPO + '"></label>';
  }

  function valorDo(id) {
    var el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  function abrirLogin(avisoInicial) {
    var corpo = abrir('Entrar no painel');
    corpo.innerHTML = (avisoInicial ? '<p style="margin:0 0 4px;color:#4b5563;">' + avisoInicial + '</p>' : '') +
      campo('pl-email', 'E-mail', 'email', 'username') +
      campo('pl-senha', 'Senha', 'password', 'current-password') +
      '<button type="button" id="pl-entrar" style="' + ESTILO_BOTAO + '">Entrar</button>' +
      '<button type="button" id="pl-esqueci" style="' + ESTILO_LINK + '">Esqueci a senha</button>';
    document.getElementById('pl-entrar').onclick = entrar;
    document.getElementById('pl-esqueci').onclick = esqueci;
    document.getElementById('pl-senha').onkeydown = function (e) { if (e.key === 'Enter') entrar(); };
  }

  function entrar() {
    var email = valorDo('pl-email');
    var senhaEl = document.getElementById('pl-senha');
    var senha = senhaEl ? senhaEl.value : '';
    if (!email || !senha) return aviso('Informe e-mail e senha.', true);
    var c = sb();
    if (!c) return aviso('Login indisponível agora. Recarregue a página.', true);
    aviso('Entrando...', false);
    c.auth.signInWithPassword({ email: email, password: senha }).then(function (r) {
      if (senhaEl) senhaEl.value = '';
      if (r.error) return aviso('Não entrou: ' + r.error.message, true);
      atualizarBotao();
      fechar();
    });
  }

  function esqueci() {
    var email = valorDo('pl-email');
    if (!email) return aviso('Digite o e-mail primeiro.', true);
    var c = sb();
    if (!c) return aviso('Login indisponível agora. Recarregue a página.', true);
    c.auth.resetPasswordForEmail(email, { redirectTo: location.origin + '/' }).then(function (r) {
      if (r.error) return aviso('Não foi possível enviar: ' + r.error.message, true);
      aviso('Enviamos um link para o e-mail. Abra-o neste mesmo navegador.', false);
    });
  }

  // Chega aqui quando a pessoa abre o link de recuperação do e-mail
  function novaSenha() {
    var corpo = abrir('Defina sua nova senha');
    corpo.innerHTML = campo('pl-nova', 'Nova senha (mínimo 8 caracteres)', 'password', 'new-password') +
      '<button type="button" id="pl-salvar" style="' + ESTILO_BOTAO + '">Salvar senha</button>';
    document.getElementById('pl-salvar').onclick = function () {
      var el = document.getElementById('pl-nova');
      var nova = el ? el.value : '';
      if (nova.length < 8) return aviso('Use pelo menos 8 caracteres.', true);
      sb().auth.updateUser({ password: nova }).then(function (r) {
        if (el) el.value = '';
        if (r.error) return aviso('Não foi possível salvar: ' + r.error.message, true);
        aviso('Senha salva. Você já está logado.', false);
        atualizarBotao();
        setTimeout(fechar, 1200);
      });
    };
  }

  function sair() {
    var c = sb();
    if (!c) return;
    c.auth.signOut().then(atualizarBotao);
  }

  function criarBotao() {
    botao = document.createElement('button');
    botao.type = 'button';
    botao.id = 'painel-login-botao';
    botao.textContent = 'Entrar';
    botao.setAttribute('style', 'position:fixed;left:12px;bottom:12px;z-index:5500;padding:8px 12px;border:1px solid #cfd4dc;border-radius:999px;background:#fff;color:#111827;font:inherit;font-size:13px;font-weight:600;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.12);');
    botao.onclick = function () {
      if (botao.getAttribute('data-logado') === '1') sair(); else abrirLogin('');
    };
    document.body.appendChild(botao);
    atualizarBotao();
  }

  sb(); // cria o cliente cedo, para tratar o link de recuperação de senha que volta na URL
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', criarBotao);
  else criarBotao();
})();
