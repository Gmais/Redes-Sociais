-- Concorrentes: resumo público de cada consulta (Business Discovery).
-- Só acrescenta colunas em competitor_snapshots. As colunas antigas e as políticas de RLS ficam como estão.
-- Grava-se com a chave de serviço (servidor), então a RLS de inserção manual não se aplica a estas linhas.

alter table public.competitor_snapshots
  add column if not exists publicacoes_30d integer check (publicacoes_30d is null or publicacoes_30d >= 0),
  add column if not exists engajamento_medio numeric(10,1) check (engajamento_medio is null or engajamento_medio >= 0),
  add column if not exists amostra_publicacoes integer check (amostra_publicacoes is null or amostra_publicacoes >= 0),
  add column if not exists tipos jsonb,
  add column if not exists ultima_publicacao_em timestamptz;
