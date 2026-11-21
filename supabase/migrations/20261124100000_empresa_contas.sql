-- Empresa de cada conta: Academia, Sorveteria ou GympulsePro. Liga a conta à página da empresa na Análise.
-- Só acrescenta a coluna. Nulo = conta ainda sem empresa. As políticas de RLS continuam as mesmas.

alter table public.social_accounts
  add column if not exists empresa text
  check (empresa is null or empresa in ('academia', 'sorveteria', 'gympulse'));
