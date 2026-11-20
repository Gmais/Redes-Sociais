// Acesso ao Supabase a partir das funções serverless, sem bibliotecas (fetch direto, como o resto do
// projeto). Duas chaves, com papéis diferentes:
//   - SUPABASE_ANON_KEY: pública. Só para validar o token de quem fez a requisição.
//   - SUPABASE_SERVICE_ROLE_KEY: secreta, ignora RLS. Só no servidor, nunca no navegador.
//
// Autorização: o usuário envia o token do Supabase Auth (Authorization: Bearer ...). O servidor
// confirma o usuário no Supabase e checa o papel dele na organização antes de qualquer operação.

const PAPEIS = ['viewer', 'editor', 'admin', 'owner'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

class ErroHttp extends Error {
  constructor(status, mensagem) {
    super(mensagem);
    this.status = status;
  }
}

function configSupabase(env = process.env) {
  const url = env.SUPABASE_URL;
  const anon = env.SUPABASE_ANON_KEY;
  const service = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon || !service) {
    throw new Error('Configure SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY no Vercel');
  }
  return { url: url.replace(/\/$/, ''), anon, service };
}

function tokenDoRequest(req) {
  const cabecalho = (req && req.headers && req.headers.authorization) || '';
  const m = /^Bearer\s+(\S+)$/i.exec(cabecalho);
  return m ? m[1] : null;
}

// Retorna { id, email } do usuário logado, ou null se não houver token válido.
async function usuarioDoRequest(req, deps = {}) {
  const token = tokenDoRequest(req);
  if (!token) return null;
  const cfg = deps.config || configSupabase();
  const f = deps.fetch || fetch;
  const r = await f(`${cfg.url}/auth/v1/user`, {
    headers: { apikey: cfg.anon, Authorization: `Bearer ${token}` }
  });
  if (!r.ok) return null;
  const u = await r.json();
  return u && u.id ? { id: u.id, email: u.email || null } : null;
}

// Papel do usuário na organização, ou null se ele não é membro.
async function papelNaOrganizacao(userId, orgId, deps = {}) {
  if (!UUID.test(String(orgId))) throw new ErroHttp(400, 'organização inválida');
  if (!UUID.test(String(userId))) throw new ErroHttp(400, 'usuário inválido');
  const cfg = deps.config || configSupabase();
  const f = deps.fetch || fetch;
  const consulta = `organization_members?select=role` +
    `&organization_id=eq.${encodeURIComponent(orgId)}&user_id=eq.${encodeURIComponent(userId)}`;
  const r = await f(`${cfg.url}/rest/v1/${consulta}`, {
    headers: { apikey: cfg.service, Authorization: `Bearer ${cfg.service}` }
  });
  if (!r.ok) throw new Error('falha ao consultar membros da organização');
  const linhas = await r.json();
  return linhas[0] ? linhas[0].role : null;
}

// Exige usuário logado com papel >= minimo na organização. Retorna { user, role, organizationId }.
// Lança ErroHttp 401 (sem login), 403 (sem papel suficiente) ou 400 (ids inválidos).
async function exigirPapel(req, orgId, minimo, deps = {}) {
  if (!PAPEIS.includes(minimo)) throw new Error(`papel mínimo desconhecido: ${minimo}`);
  const user = await usuarioDoRequest(req, deps);
  if (!user) throw new ErroHttp(401, 'não autenticado');
  const role = await papelNaOrganizacao(user.id, orgId, deps);
  if (!role || PAPEIS.indexOf(role) < PAPEIS.indexOf(minimo)) {
    throw new ErroHttp(403, 'sem permissão nesta organização');
  }
  return { user, role, organizationId: orgId };
}

module.exports = { ErroHttp, PAPEIS, configSupabase, usuarioDoRequest, papelNaOrganizacao, exigirPapel };
