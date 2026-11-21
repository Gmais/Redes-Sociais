// Fase 1: auditoria do perfil (ig-profile) e o texto das skills de auditoria e bio. Sem rede.
const assert = require('assert');
const crypto = require('crypto');
const perfil = require('../lib/perfil');
const respostas = require('../lib/respostas');
const escrita = require('../lib/escrita');
const { cifrarToken } = require('../lib/token-vault');

// ── auditoria: nota só com o que a API mostra ─────────────────────────────────
{
  const boa = perfil.auditar({
    perfil: {
      username: 'planeta_corpo',
      name: 'Planeta Corpo | Academia',
      biography: 'Treino de força para quem começa do zero, com turmas às terças e quintas.\nAgende sua aula experimental.',
      website: 'https://planetacorpo.exemplo'
    },
    publicacoesUltimos7Dias: 3
  });
  assert.strictEqual(boa.nota, 100, 'perfil completo nos itens verificáveis dá 100');
  assert.ok(boa.naoVerificados.some((i) => i.id === 'pinned_three'), 'posts fixados ficam como não verificados');
  assert.ok(!boa.itens.some((i) => i.id === 'pinned_three'), 'posts fixados não entram na nota');
}
{
  const vazio = perfil.auditar({ perfil: { username: 'a' }, publicacoesUltimos7Dias: 0 });
  // Sem nome (0), bio vazia (0 + 0), sem link (0), usuário curto de 1 letra (3 de 6), sem atividade (0)
  assert.strictEqual(vazio.nota, Math.round((3 / 56) * 100), 'nota só com os itens verificáveis');
  assert.ok(vazio.itens.find((i) => i.id === 'bio_first_line').status === 'falta', 'bio vazia é apontada');
  assert.ok(vazio.itens.find((i) => i.id === 'recent_activity').status === 'falta', 'sem posts nos últimos 7 dias é apontado');
}
{
  const bioLonga = 'x'.repeat(170);
  const r = perfil.auditar({ perfil: { username: 'conta_legal', name: 'Nome Completo', biography: bioLonga, website: 'https://x.exemplo' }, publicacoesUltimos7Dias: 1 });
  const corpo = r.itens.find((i) => i.id === 'bio_body');
  assert.strictEqual(corpo.status, 'parcial', 'bio acima de 150 caracteres é parcial');
  assert.ok(/150/.test(corpo.dica));
}

// ── busca da conta: a Meta recebe o token da conta e os campos certos ─────────
(async () => {
  const chamadas = [];
  const f = async (url) => {
    chamadas.push(url);
    return { ok: true, status: 200, text: async () => JSON.stringify({ username: 'a', name: 'Nome', biography: 'bio' }) };
  };
  const conta = { id: 'c1', external_id: '999', parent_external_id: null };
  const dados = await perfil.buscarPerfilDaConta({ conta, token: 'tok', f });
  assert.strictEqual(dados.username, 'a');
  assert.ok(chamadas[0].startsWith('https://graph.instagram.com/v27.0/999?'), 'conta do Instagram usa o host certo');
  assert.ok(chamadas[0].includes('biography') && chamadas[0].includes('website'), 'pede os campos do perfil');

  // Erro da Meta vira ErroPerfil com a mensagem dela
  const ruim = async () => ({ ok: false, status: 400, text: async () => JSON.stringify({ error: { message: 'token expirado' } }) });
  await assert.rejects(() => perfil.buscarPerfilDaConta({ conta, token: 'tok', f: ruim }),
    (e) => e instanceof perfil.ErroPerfil && /token expirado/.test(e.message));

  // ── contaComToken só acha conta da própria organização ─────────────────────
  const chave = crypto.randomBytes(32).toString('base64');
  const contaId = '11111111-1111-4111-8111-111111111111';
  const cifrado = cifrarToken('tok-da-conta', contaId, chave);
  const urls = [];
  const banco = async (url) => {
    urls.push(url);
    const corpo = url.includes('social_accounts')
      ? [{ id: contaId, external_id: '999', username: 'a' }]
      : [{ access_token_encrypted: cifrado, token_expires_at: null }];
    return { ok: true, status: 200, text: async () => JSON.stringify(corpo) };
  };
  const cfg = { url: 'https://banco.exemplo', service: 's' };
  const r = await respostas.contaComToken({ cfg, f: banco, chave, contaId, agora: Date.now(), orgId: 'org-1' });
  assert.strictEqual(r.token, 'tok-da-conta');
  assert.ok(urls[0].includes('organization_id=eq.org-1'), 'a busca da conta filtra pela organização');

  // ── textos das skills novas no gerador ──────────────────────────────────────
  assert.ok(escrita.TIPOS.includes('auditoria') && escrita.TIPOS.includes('bio'));
  assert.ok(escrita.REGRAS.auditoria.includes('Não invente métricas'), 'a auditoria não inventa números');
  assert.ok(escrita.REGRAS.bio.includes('150 caracteres'), 'a bio tem o limite da skill');

  console.log('ok (perfil)');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
