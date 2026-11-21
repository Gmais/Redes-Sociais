-- Análise com IA por período (botão "Gerar análise"): novo tipo em ai_analyses.
-- Só troca a regra de valores aceitos em kind. As linhas e as políticas de RLS continuam iguais.

alter table public.ai_analyses drop constraint if exists ai_analyses_kind_check;
alter table public.ai_analyses add constraint ai_analyses_kind_check
  check (kind in ('post', 'weekly', 'monthly', 'question', 'periodo'));
