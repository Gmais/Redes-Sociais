-- GymPulse -> painel Instagran: totais diários para o Modo Automático (Academia e GympulsePro).
-- Aplicado no projeto GymPulse (ndzbfvxnallshfiouszk) em 16/11/2026.
--
-- Só TOTAIS e MÉDIAS saem daqui: nenhum nome, e-mail ou dado de aluno.
-- instagran_stats() calcula; instagran_push_stats() grava no banco do painel
-- (painel_gilson_state, chaves dados_gympulse_planeta e dados_gympulse_plataforma)
-- com a chave pública (anon) do painel, a mesma que já está no index.html.
-- pg_cron roda todo dia às 08:30 UTC (05:30 em Brasília), antes do Modo Automático (09:00 UTC).
-- As duas funções são SECURITY DEFINER e NÃO ficam expostas na API (execute revogado).

create or replace function public.instagran_stats()
returns jsonb language sql stable security definer set search_path = public as $$
with cfg as (select '00000000-0000-0000-0000-000000000001'::uuid planeta, '00000000-0000-0000-0000-000000000000'::uuid padrao),
planeta as (
  select count(distinct s.id) aulas, count(p.id) participacoes, count(distinct p.student_id) alunos,
         coalesce(round(sum(p.calories)), 0) kcal, round(avg(p.calories)) kcal_media, round(avg(p.points)) pontos_media
  from cfg, class_sessions s left join class_participants p on p.session_id = s.id
  where s.tenant_id = cfg.planeta and s.date > now() - interval '30 days'),
fit as (
  select coalesce(sum(amount) filter (where amount > 0), 0) ganhos, count(*) filter (where type = 'redemption') resgates
  from cfg, fitcoin_transactions f where f.tenant_id = cfg.planeta),
plat as (
  select (select count(*) from tenants, cfg where id is distinct from cfg.padrao) academias,
         (select count(distinct tenant_id) from class_sessions, cfg where date > now() - interval '30 days' and tenant_id is distinct from cfg.padrao) academias_com_aula_30d,
         (select count(*) from students, cfg where active and tenant_id is distinct from cfg.padrao) alunos_cadastrados,
         (select count(*) from class_sessions, cfg where tenant_id is distinct from cfg.padrao) aulas_monitoradas_total,
         (select count(*) from class_sessions, cfg where date > now() - interval '30 days' and tenant_id is distinct from cfg.padrao) aulas_monitoradas_30d,
         (select count(*) from class_participants, cfg where tenant_id is distinct from cfg.padrao) participacoes_total,
         (select coalesce(round(sum(calories)), 0) from class_participants, cfg where tenant_id is distinct from cfg.padrao) kcal_total,
         (select count(*) from sensors, cfg where tenant_id is distinct from cfg.padrao) sensores)
select jsonb_build_object(
  'planeta', jsonb_build_object('periodo', 'últimos 30 dias', 'aulas_monitoradas', planeta.aulas, 'participacoes', planeta.participacoes,
     'alunos_que_treinaram', planeta.alunos, 'kcal_total', planeta.kcal, 'kcal_media_por_aluno_por_aula', planeta.kcal_media,
     'pontos_media_por_aluno_por_aula', planeta.pontos_media, 'sensores', (select count(*) from sensors, cfg where tenant_id = cfg.planeta),
     'fitcoins_ganhos_desde_o_inicio', fit.ganhos, 'fitcoins_resgates_desde_o_inicio', fit.resgates),
  'plataforma', to_jsonb(plat), 'atualizado_em', now())
from planeta, fit, plat;
$$;

create or replace function public.instagran_push_stats()
returns bigint language plpgsql security definer set search_path = public, extensions as $$
declare
  s jsonb := public.instagran_stats();
  k text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdncGhyZ2ZnY2twc3NwYnNndWhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3NzE2NDUsImV4cCI6MjEwNDM0NzY0NX0.t_dF5I6c0wCBqOnJd6ko6Jpu_ZQyQ5ulA8buRYLAMMk';
  rid bigint;
begin
  select net.http_post(
    url := 'https://ggphrgfgckpsspbsguhp.supabase.co/rest/v1/painel_gilson_state',
    body := jsonb_build_array(
      jsonb_build_object('key', 'dados_gympulse_planeta', 'value', (s->'planeta') || jsonb_build_object('atualizado_em', s->'atualizado_em'), 'updated_at', now()),
      jsonb_build_object('key', 'dados_gympulse_plataforma', 'value', (s->'plataforma') || jsonb_build_object('atualizado_em', s->'atualizado_em'), 'updated_at', now())),
    headers := jsonb_build_object('apikey', k, 'Authorization', 'Bearer ' || k, 'Content-Type', 'application/json',
                                  'Prefer', 'resolution=merge-duplicates,return=minimal')
  ) into rid;
  return rid;
end $$;

revoke all on function public.instagran_stats() from public, anon, authenticated;
revoke all on function public.instagran_push_stats() from public, anon, authenticated;

select cron.schedule('instagran-dados', '30 8 * * *', 'select public.instagran_push_stats()');
