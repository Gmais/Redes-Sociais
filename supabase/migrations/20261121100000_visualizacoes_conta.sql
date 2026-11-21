-- Visualizações da conta (métrica "views" da API), gravadas por dia em account_insights.
-- Rodar no SQL Editor do projeto Supabase ggphrgfgckpsspbsguhp, antes do deploy que usa esta coluna.
alter table public.account_insights
  add column if not exists views integer check (views is null or views >= 0);
