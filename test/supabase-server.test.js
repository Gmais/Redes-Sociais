// Testa a checagem de login e de papel por organização, com fetch falso (sem rede).
const assert = require('assert');
const { ErroHttp, exigirPapel, usuarioDoRequest, papelNaOrganizacao } = require('../lib/supabase-server');

const CFG = { url: 'https://projeto.supabase.co', anon: 'anon-publica', service: 'service-secreta' };
const USER = '11111111-1111-1111-1111-111111111111';
const ORG = '22222222-2222-2222-2222-222222222222';
const req = (token) => ({ headers: token ? { authorization: 'Bearer ' + token } : {} });

// fetch falso: responde conforme a URL. chamadas registra o que foi pedido.
function fetchFalso({ usuario = { id: USER, email: 'a@x.com' }, papel = 'owner', tokenValido = true } = {}) {
  const chamadas = [];
  const f = async (url, opts) => {
    chamadas.push({ url, opts });
    if (url.includes('/auth/v1/user')) {
      if (!tokenValido) return { ok: false, status: 401, json: async () => ({}) };
      return { ok: true, status: 200, json: async () => usuario };
    }
    if (url.includes('/rest/v1/organization_members')) {
      return { ok: true, status: 200, json: async () => (papel ? [{ role: papel }] : []) };
    }
    throw new Error('url inesperada ' + url);
  };
  return { f, chamadas };
}

(async () => {
  // Sem header: não autenticado.
  assert.strictEqual(await usuarioDoRequest(req(null), { config: CFG, fetch: fetchFalso().f }), null);

  // Token rejeitado pelo Supabase.
  assert.strictEqual(await usuarioDoRequest(req('expirado'), { config: CFG, fetch: fetchFalso({ tokenValido: false }).f }), null);

  // Token válido: identifica o usuário e manda a chave anon, nunca a de serviço, nessa chamada.
  const dep = fetchFalso();
  const u = await usuarioDoRequest(req('tok'), { config: CFG, fetch: dep.f });
  assert.deepStrictEqual(u, { id: USER, email: 'a@x.com' });
  assert.strictEqual(dep.chamadas[0].opts.headers.apikey, CFG.anon);
  assert.ok(!JSON.stringify(dep.chamadas[0].opts).includes(CFG.service), 'chave de serviço não vai para validar login');

  // Papel: a consulta usa a chave de serviço e filtra por organização e usuário.
  const dep2 = fetchFalso({ papel: 'editor' });
  assert.strictEqual(await papelNaOrganizacao(USER, ORG, { config: CFG, fetch: dep2.f }), 'editor');
  assert.ok(dep2.chamadas[0].url.includes(`organization_id=eq.${ORG}`));
  assert.ok(dep2.chamadas[0].url.includes(`user_id=eq.${USER}`));
  assert.strictEqual(dep2.chamadas[0].opts.headers.apikey, CFG.service);

  // Não membro: papel null.
  assert.strictEqual(await papelNaOrganizacao(USER, ORG, { config: CFG, fetch: fetchFalso({ papel: null }).f }), null);

  // exigirPapel: sem login -> 401.
  await assert.rejects(exigirPapel(req(null), ORG, 'viewer', { config: CFG, fetch: fetchFalso().f }),
    (e) => e instanceof ErroHttp && e.status === 401);

  // Não membro -> 403.
  await assert.rejects(exigirPapel(req('tok'), ORG, 'viewer', { config: CFG, fetch: fetchFalso({ papel: null }).f }),
    (e) => e.status === 403);

  // Viewer não atinge editor -> 403. Editor atinge editor. Owner atinge admin.
  await assert.rejects(exigirPapel(req('tok'), ORG, 'editor', { config: CFG, fetch: fetchFalso({ papel: 'viewer' }).f }),
    (e) => e.status === 403);
  const ok1 = await exigirPapel(req('tok'), ORG, 'editor', { config: CFG, fetch: fetchFalso({ papel: 'editor' }).f });
  assert.strictEqual(ok1.role, 'editor');
  assert.strictEqual(ok1.user.id, USER);
  const ok2 = await exigirPapel(req('tok'), ORG, 'admin', { config: CFG, fetch: fetchFalso({ papel: 'owner' }).f });
  assert.strictEqual(ok2.role, 'owner');

  // Ids inválidos nunca chegam à consulta (evita injeção na URL do PostgREST).
  await assert.rejects(exigirPapel(req('tok'), 'x&select=*', 'viewer', { config: CFG, fetch: fetchFalso().f }),
    (e) => e.status === 400);
  await assert.rejects(exigirPapel(req('tok'), ORG + '&role=eq.owner', 'viewer', { config: CFG, fetch: fetchFalso().f }),
    (e) => e.status === 400);

  // Papel mínimo desconhecido é erro de programação.
  await assert.rejects(exigirPapel(req('tok'), ORG, 'superuser', { config: CFG, fetch: fetchFalso().f }));

  // Configuração ausente é erro claro, sem vazar valores.
  assert.throws(() => require('../lib/supabase-server').configSupabase({}), /Configure SUPABASE_URL/);

  console.log('ok (supabase-server)');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
