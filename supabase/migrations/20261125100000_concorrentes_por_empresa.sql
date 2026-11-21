-- Concorrentes por empresa: cada concorrente fica com uma das empresas (Academia, Sorveteria ou GympulsePro).
-- Só acrescenta a coluna. Nulo = concorrente ainda sem empresa. As políticas de RLS continuam as mesmas.

alter table public.competitor_accounts
  add column if not exists empresa text
  check (empresa is null or empresa in ('academia', 'sorveteria', 'gympulse'));
