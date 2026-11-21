// Escrita com IA (Nova Postagem) e checagem de texto (ig-human). Sem rede: a OpenAI é uma resposta falsa.
const assert = require('assert');
const humano = require('../lib/humano');
const escrita = require('../lib/escrita');

// ── limpar: travessão, aspas curvas, invisíveis e expressões típicas ──────────
{
  const limpo = humano.limpar('Vamos juntos — “sem rodeios”​. No mundo de hoje, é fundamental agir.');
  assert.ok(!/—|“|”|​/.test(limpo), 'sem travessão, aspas curvas ou invisíveis');
  assert.ok(limpo.includes('"sem rodeios"'), 'aspas viram aspas retas');
  assert.ok(limpo.startsWith('Vamos juntos, '), 'travessão vira vírgula');
  assert.ok(limpo.includes('Hoje,'), '"No mundo de hoje" vira "Hoje", com a maiúscula original');
  assert.ok(limpo.includes('é fundamental'), 'expressão sem troca automática fica no texto, para a pessoa reescrever');
}

// ── avisos: o que sobrou depois de limpar ─────────────────────────────────────
{
  const achados = humano.avisos(humano.limpar('Não é só academia, é um estilo de vida. Vale ressaltar que é fundamental.'));
  assert.ok(achados.some((a) => a.tipo === 'estrutura' && /Não é só/.test(a.trecho)), 'aponta a estrutura "não é só X, é Y"');
  assert.ok(achados.some((a) => a.tipo === 'expressão' && a.trecho === 'é fundamental'), 'aponta "é fundamental"');
  assert.ok(!achados.some((a) => a.trecho === 'vale ressaltar'), '"vale ressaltar" foi trocado, não apenas apontado');
}

// ── legenda: link, hashtags, primeira linha e saudação ────────────────────────
{
  const primeiraLonga = 'Oi, ' + 'a'.repeat(130);
  const achados = humano.avisosLegenda(`${primeiraLonga}\nVeja em https://exemplo.com\n#a #b #c #d #e #f`);
  const trechos = achados.map((a) => a.trecho);
  assert.ok(trechos.includes('link'), 'aponta link');
  assert.ok(trechos.includes('6 hashtags'), 'conta hashtags');
  assert.ok(trechos.includes('primeira linha'), 'aponta primeira linha acima de 125 caracteres');
  assert.ok(trechos.some((t) => /Oi/.test(t)), 'aponta saudação na primeira linha');
}

// ── gerar: resposta falsa da OpenAI, limpa e com avisos ──────────────────────
(async () => {
  const chamadas = [];
  const f = async (url, opts) => {
    chamadas.push({ url, corpo: JSON.parse(opts.body) });
    const conteudo = JSON.stringify({ texto: 'Treino de força — sem desculpas.\nNo mundo de hoje, é fundamental.', notas: ['Falta o número de alunos.'] });
    return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: conteudo } }] }) };
  };
  const env = {};
  const r = await escrita.gerar({ tipo: 'legenda', pedido: 'Divulgar a aula de força de sábado', apiKey: 'k', env, f });
  assert.ok(!/—/.test(r.texto), 'texto gerado sai sem travessão');
  assert.ok(r.texto.includes('Hoje,'), 'expressão típica é trocada no texto final');
  assert.deepStrictEqual(r.notas, ['Falta o número de alunos.'], 'notas da IA chegam à tela');
  assert.ok(r.avisos.some((a) => a.trecho === 'é fundamental'), 'avisos chegam junto');
  assert.ok(chamadas[0].corpo.messages[0].content.includes('Tarefa: legenda'), 'o prompt da legenda carrega a regra da skill');
  assert.ok(chamadas[0].corpo.messages[1].content.includes('Divulgar a aula de força'), 'o pedido vai como dado do usuário');

  // Cada tipo usa a sua regra
  for (const tipo of escrita.TIPOS) {
    await escrita.gerar({ tipo, pedido: 'Algo', apiKey: 'k', env, f });
  }
  assert.ok(chamadas.slice(1).every((c, i) => c.corpo.messages[0].content.includes(escrita.REGRAS[escrita.TIPOS[i]])), 'cada tipo manda a sua regra');

  // Entradas inválidas
  await assert.rejects(() => escrita.gerar({ tipo: 'tweet', pedido: 'x', apiKey: 'k', env, f }), (e) => e.status === 400, 'tipo inválido');
  await assert.rejects(() => escrita.gerar({ tipo: 'legenda', pedido: '   ', apiKey: 'k', env, f }), (e) => e.status === 400, 'pedido vazio');
  await assert.rejects(() => escrita.gerar({ tipo: 'legenda', pedido: 'a'.repeat(2001), apiKey: 'k', env, f }), (e) => e.status === 400, 'pedido longo demais');

  // Resposta que não é JSON
  const ruim = async () => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: 'texto solto' } }] }) });
  await assert.rejects(() => escrita.gerar({ tipo: 'story', pedido: 'x', apiKey: 'k', env, f: ruim }), (e) => e.status === 502, 'resposta ilegível vira erro 502');

  console.log('ok (escrita)');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
