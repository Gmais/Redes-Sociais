-- GymFit -> painel Instagran: totais diários da catraca para o Modo Automático (Academia).
-- Aplicado no projeto GymFit (rghzhmqalgqevgtauyns, schema gymfit) em 16/11/2026.
--
-- Só TOTAIS e MÉDIAS saem daqui: nenhum nome, CPF, telefone ou dado de aluno.
-- "Treino" = um aluno num dia (duas passagens no mesmo dia contam uma), só entrada liberada.
-- instagran_push_stats() grava em painel_gilson_state (chave dados_gymfit) com a chave pública (anon)
-- do painel, a mesma do index.html. pg_cron todo dia 08:30 UTC (05:30 Brasília), antes do Modo Automático.
-- Liga pg_net e pg_cron neste projeto (ainda não estavam ligados). Execute revogado da API.

create extension if not exists pg_net;
create extension if not exists pg_cron;

create or replace function gymfit.instagran_stats()
returns jsonb language sql stable security definer set search_path = gymfit, public as $$
with acc as (
  select (occurred_at at time zone 'America/Sao_Paulo') t, member_id from gymfit.access_logs
  where granted and direction = 'entrada' and member_id is not null and occurred_at > now() - interval '30 days'),
v as (select member_id, t::date d, min(t) primeira from acc group by 1, 2),
horas as (select extract(hour from primeira)::int h, count(*) n from v group by 1 order by 2 desc limit 3),
dias as (select extract(isodow from d)::int dw, count(*) n from v group by 1 order by 2 desc limit 2)
select jsonb_build_object(
  'periodo', 'últimos 30 dias (catraca)',
  'alunos_ativos', (select count(*) from gymfit.member_situation where situation = 'ativo'),
  'alunos_que_treinaram_30d', (select count(distinct member_id) from v),
  'treinos_30d', (select count(*) from v),
  'treinos_7d', (select count(*) from v where d > (now() at time zone 'America/Sao_Paulo')::date - 7),
  'media_treinos_por_dia_30d', round((select count(*) from v) / 30.0),
  'media_treinos_por_aluno_30d', round((select count(*) from v)::numeric / nullif((select count(distinct member_id) from v), 0), 1),
  'horarios_de_pico', (select jsonb_agg(lpad(h::text, 2, '0') || 'h' order by n desc) from horas),
  'dias_mais_movimentados', (select jsonb_agg((array['segunda','terça','quarta','quinta','sexta','sábado','domingo'])[dw] order by n desc) from dias),
  'atualizado_em', now());
$$;

create or replace function gymfit.instagran_push_stats()
returns bigint language plpgsql security definer set search_path = gymfit, public, extensions as $$
declare
  k text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdncGhyZ2ZnY2twc3NwYnNndWhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3NzE2NDUsImV4cCI6MjEwNDM0NzY0NX0.t_dF5I6c0wCBqOnJd6ko6Jpu_ZQyQ5ulA8buRYLAMMk';
  rid bigint;
begin
  select net.http_post(
    url := 'https://ggphrgfgckpsspbsguhp.supabase.co/rest/v1/painel_gilson_state',
    body := jsonb_build_array(jsonb_build_object('key', 'dados_gymfit', 'value', gymfit.instagran_stats(), 'updated_at', now())),
    headers := jsonb_build_object('apikey', k, 'Authorization', 'Bearer ' || k, 'Content-Type', 'application/json',
                                  'Prefer', 'resolution=merge-duplicates,return=minimal')
  ) into rid;
  return rid;
end $$;

revoke all on function gymfit.instagran_stats() from public, anon, authenticated;
revoke all on function gymfit.instagran_push_stats() from public, anon, authenticated;

select cron.schedule('instagran-dados-gymfit', '30 8 * * *', 'select gymfit.instagran_push_stats()');
