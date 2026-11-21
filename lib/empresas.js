// Empresa de cada conta: Academia, Sorveteria ou GympulsePro. Liga a conta à página da empresa na Análise.
// Só o servidor grava (chave de serviço). Quem pode mudar é owner ou admin, checado na rota.

const { rest } = require('./meta-oauth');

const EMPRESAS = ['academia', 'sorveteria', 'gympulse'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

class ErroEmpresa extends Error {
  constructor(mensagem, status = 400) {
    super(mensagem);
    this.status = status;
  }
}

// Define a empresa de uma conta da organização. empresa = null tira a conta da empresa.
async function definirEmpresa({ orgId, contaId, empresa, cfg, f }) {
  if (!UUID.test(String(contaId || ''))) throw new ErroEmpresa('Conta inválida.');
  if (empresa !== null && !EMPRESAS.includes(empresa)) throw new ErroEmpresa('Empresa desconhecida.');
  const org = encodeURIComponent(orgId);
  const id = encodeURIComponent(contaId);
  const encontradas = await rest(cfg, f, 'GET', `social_accounts?select=id&id=eq.${id}&organization_id=eq.${org}`) || [];
  if (!encontradas.length) throw new ErroEmpresa('Conta não encontrada nesta organização.', 404);
  await rest(cfg, f, 'PATCH', `social_accounts?id=eq.${id}&organization_id=eq.${org}`, { empresa }, { Prefer: 'return=minimal' });
  return { id: contaId, empresa };
}

module.exports = { EMPRESAS, ErroEmpresa, definirEmpresa };
