// Aplica a migration num Postgres local (PGlite) com um esquema auth simulado e testa o isolamento.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const MIGRATIONS = ['20261120120000_analise_redes_sociais.sql', '20261121100000_visualizacoes_conta.sql', '20261122100000_concorrentes_resumo.sql', '20261123100000_ia_periodo.sql', '20261124100000_empresa_contas.sql', '20261125100000_concorrentes_por_empresa.sql', '20261126100000_respostas_comentarios.sql', '20261128100000_dm_respostas.sql']
  .map((nome) => fileURLToPath(new URL('../../supabase/migrations/' + nome, import.meta.url)));
const db = new PGlite();
let falhas = 0, ok = 0;
const teste = (nome, cond) => { if (cond) { ok++; console.log('  ok   ' + nome); } else { falhas++; console.log('  FALHA ' + nome); } };

async function expectErro(nome, sql, trecho) {
  try { await db.exec(sql); teste(nome + ' (deveria falhar)', false); }
  catch (e) { teste(nome + (trecho && !String(e.message).includes(trecho) ? ` (erro diferente: ${e.message})` : ''), !trecho || String(e.message).includes(trecho)); }
}
async function expectOk(nome, sql) {
  try { await db.exec(sql); teste(nome, true); }
  catch (e) { teste(nome + ' -> ' + e.message, false); }
}
async function count(sql) { const r = await db.query(sql); return Number(r.rows[0].n); }
async function como(role, uid) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid || ''}', false);`);
  if (role) await db.exec(`set role ${role};`);
}

// ── Esquema simulado do Supabase ────────────────────────────────────────────
await db.exec(`
  do $$ begin
    if not exists (select from pg_roles where rolname = 'anon') then create role anon nologin; end if;
    if not exists (select from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
    if not exists (select from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
  end $$;
  create schema if not exists auth;
  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}'::jsonb);
  create or replace function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated, service_role;
  grant usage on schema public to anon, authenticated, service_role;
  -- Padrão do Supabase: anon e authenticated ganham tudo em tabelas novas do schema public.
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
  -- Tabela antiga do painel: precisa continuar acessível pelo anon depois da migration.
  create table public.painel_gilson_state (key text primary key, value jsonb, updated_at timestamptz default now());
  grant all on public.painel_gilson_state to anon, authenticated;
`);
await db.exec(`insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'dono@x.com', '{"full_name":"Dona A"}'),
  ('22222222-2222-2222-2222-222222222222', 'dono2@x.com', '{}'),
  ('33333333-3333-3333-3333-333333333333', 'viewer@x.com', '{}');`);

// ── Migration ────────────────────────────────────────────────────────────────
console.log('Aplicando migration...');
for (const arquivo of MIGRATIONS) await db.exec(readFileSync(arquivo, 'utf8'));
teste('migration aplicada sem erro', true);

const A = '11111111-1111-1111-1111-111111111111';
const B = '22222222-2222-2222-2222-222222222222';
const C = '33333333-3333-3333-3333-333333333333';

console.log('\nUsuários e organizações');
teste('trigger criou public.users para os 3 usuários', await count('select count(*) n from public.users') === 3);
teste('nome vindo do raw_user_meta_data', (await db.query("select name from public.users where id = '" + A + "'")).rows[0].name === 'Dona A');

await como('authenticated', A);
await expectOk('A cria a organização Academia', `select public.create_organization('Academia Planeta')`);
const orgA = (await db.query(`select id from public.organizations where name = 'Academia Planeta'`)).rows[0].id;
await como('authenticated', B);
await expectOk('B cria a organização Guri', `select public.create_organization('Sorveteria Guri')`);
const orgB = (await db.query(`select id from public.organizations where name = 'Sorveteria Guri'`)).rows[0].id;
await como(null);
teste('quem criou virou owner', (await db.query(`select role from public.organization_members where organization_id = '${orgA}' and user_id = '${A}'`)).rows[0].role === 'owner');

await como('authenticated', A);
teste('A enxerga só a própria organização', await count('select count(*) n from public.organizations') === 1);
await expectErro('A não cria organização direto (sem a função)', `insert into public.organizations (name) values ('Fura fila')`, 'permission denied');
await como('authenticated', B);
teste('B não enxerga a organização da Academia', await count(`select count(*) n from public.organizations where id = '${orgA}'`) === 0);

console.log('\nIsolamento de dados');
await como(null);
await db.exec(`insert into public.social_accounts (organization_id, platform, external_id, username) values
  ('${orgA}', 'instagram', 'ig_academia', 'academia.planeta'),
  ('${orgB}', 'instagram', 'ig_guri', 'sorveteria.guri');`);
await db.exec(`insert into public.social_tokens (social_account_id, access_token_encrypted)
  select id, 'v1.teste.teste.teste' from public.social_accounts where external_id = 'ig_academia';`);
await como('authenticated', A);
teste('A lê só as contas da própria organização', await count('select count(*) n from public.social_accounts') === 1);
await expectErro('A não grava conta social (dado da Meta é do servidor)', `insert into public.social_accounts (organization_id, platform, external_id) values ('${orgA}', 'facebook', 'x')`, 'permission denied');
await expectErro('A não altera post da Meta', `update public.social_posts set caption = 'x'`, 'permission denied');
await expectErro('A não lê tokens da Meta', `select count(*) from public.social_tokens`, 'permission denied');
await como('authenticated', B);
teste('B não lê tokens de nenhuma organização', await count('select count(*) n from public.social_accounts') === 1);
await expectErro('B não lê a tabela de tokens', `select * from public.social_tokens`, 'permission denied');

console.log('\nPapéis e permissões');
await como(null);
await db.exec(`insert into public.users (id, email) values ('${C}', 'viewer@x.com') on conflict do nothing;
  insert into public.organization_members (organization_id, user_id, role) values ('${orgA}', '${C}', 'viewer');`);
await como('authenticated', C);
teste('viewer enxerga a organização', await count('select count(*) n from public.organizations') === 1);
await expectErro('viewer não cria concorrente', `insert into public.competitor_accounts (organization_id, handle) values ('${orgA}', 'concorrente')`, 'row-level security');

await como('authenticated', A);
await expectOk('owner cria concorrente', `insert into public.competitor_accounts (organization_id, handle, display_name) values ('${orgA}', 'concorrente.x', 'Concorrente X')`);
await expectErro('owner não cria concorrente em outra organização', `insert into public.competitor_accounts (organization_id, handle) values ('${orgB}', 'invasor')`, 'row-level security');
await expectErro('handle com caracteres inválidos', `insert into public.competitor_accounts (organization_id, handle) values ('${orgA}', 'com espaço')`, 'check');
await expectOk('owner convida viewer como editor (muda papel)', `update public.organization_members set role = 'editor' where user_id = '${C}'`);
await como('authenticated', C);
await expectOk('editor cria concorrente', `insert into public.competitor_accounts (organization_id, handle) values ('${orgA}', 'concorrente.y')`);
await expectErro('editor não grava snapshot de fonte automática', `insert into public.competitor_snapshots (competitor_id, organization_id, source, followers_count) select id, organization_id, 'business_discovery', 10 from public.competitor_accounts limit 1`, 'row-level security');
await expectOk('editor grava snapshot manual', `insert into public.competitor_snapshots (competitor_id, organization_id, source, followers_count) select id, organization_id, 'manual', 10 from public.competitor_accounts limit 1`);
await expectOk('snapshot com resumo público (colunas novas)', `insert into public.competitor_snapshots (competitor_id, organization_id, source, followers_count, publicacoes_30d, engajamento_medio, amostra_publicacoes, tipos, ultima_publicacao_em) select id, organization_id, 'manual', 10, 3, 15.3, 4, '{"post": 2}'::jsonb, now() from public.competitor_accounts limit 1`);
await expectErro('publicações de 30 dias não podem ser negativas', `insert into public.competitor_snapshots (competitor_id, organization_id, source, publicacoes_30d) select id, organization_id, 'manual', -1 from public.competitor_accounts limit 1`, 'check');

await como('authenticated', A);
await expectErro('owner não deixa a organização sem owner', `update public.organization_members set role = 'viewer' where user_id = '${A}'`, 'pelo menos um owner');
await expectOk('owner promove B a admin', `insert into public.organization_members (organization_id, user_id, role) values ('${orgA}', '${B}', 'admin')`);
await como('authenticated', B);
await expectErro('admin não cria owner', `insert into public.organization_members (organization_id, user_id, role) values ('${orgA}', '${C}', 'owner')`, 'row-level security');
const linhas = await db.query(`update public.organization_members set role = 'viewer' where organization_id = '${orgA}' and user_id = '${A}' returning 1`);
teste('admin não rebaixa owner (nenhuma linha alterada)', linhas.rows.length === 0);

console.log('\nTabelas antigas do painel e anon');
await como('anon', null);
await expectErro('anon não lê organizações', `select count(*) from public.organizations`, 'permission denied');
await expectOk('anon continua gravando no painel antigo (painel_gilson_state)', `insert into public.painel_gilson_state (key, value) values ('teste_migration', '{}') on conflict (key) do update set value = excluded.value`);

console.log('\nRelatórios e logs');
await como('authenticated', A);
await expectOk('owner cria relatório agendado', `insert into public.scheduled_reports (organization_id, name, frequency, period_days, formats, recipients) values ('${orgA}', 'Semanal', 'weekly', 7, '{pdf,csv}', '{}')`);
await expectErro('relatório sem formato é recusado', `insert into public.scheduled_reports (organization_id, name, frequency, period_days, formats) values ('${orgA}', 'Vazio', 'weekly', 7, '{}')`, 'check');
await expectErro('formato desconhecido é recusado', `insert into public.scheduled_reports (organization_id, name, frequency, period_days, formats) values ('${orgA}', 'Doc', 'weekly', 7, '{docx}')`, 'check');
await expectErro('log de sincronização não é gravado pelo usuário', `insert into public.synchronization_logs (organization_id, job, origin) values ('${orgA}', 'posts', 'manual')`, 'permission denied');
await como('authenticated', C);
teste('viewer não lê o log de sincronização (só owner/admin)', await count('select count(*) n from public.synchronization_logs') === 0);

console.log('\nServidor (service_role)');
await como('service_role', null);
await expectOk('servidor grava post e métricas', `insert into public.social_posts (social_account_id, organization_id, external_id, content_type, published_at) select id, organization_id, 'p1', 'post', now() from public.social_accounts where external_id = 'ig_academia';
  insert into public.post_insights (social_post_id, organization_id, reach, likes) select id, organization_id, 120, 9 from public.social_posts where external_id = 'p1';`);
await expectOk('servidor lê tokens', `select count(*) from public.social_tokens`);
await expectErro('token que não é cifrado (formato v1.) é recusado', `insert into public.social_tokens (social_account_id, access_token_encrypted) select id, 'EAAB-em-texto-puro' from public.social_accounts where external_id = 'ig_guri'`, 'check');
await expectOk('servidor grava análise do período (kind periodo)', `insert into public.ai_analyses (organization_id, kind, status, output) select id, 'periodo', 'ok', '{}' from public.organizations limit 1`);
await expectErro('tipo de análise desconhecido é recusado', `insert into public.ai_analyses (organization_id, kind, status) select id, 'livre', 'ok' from public.organizations limit 1`, 'check');
await expectOk('servidor marca a empresa de uma conta', `update public.social_accounts set empresa = 'academia' where external_id = 'ig_academia'`);
await expectErro('empresa desconhecida é recusada', `update public.social_accounts set empresa = 'nike' where external_id = 'ig_academia'`, 'check');
await expectErro('concorrente com empresa desconhecida é recusado', `update public.competitor_accounts set empresa = 'nike' where handle = 'concorrente.x'`, 'check');
await expectErro('métrica negativa é recusada', `insert into public.account_insights (social_account_id, organization_id, metric_date, reach) select id, organization_id, '2026-11-20', -1 from public.social_accounts limit 1`, 'check');

console.log('\nExclusão de organização (cascade)');
await como('authenticated', B);
await expectOk('owner da Guri apaga a própria organização (único owner)', `delete from public.organizations where id = '${orgB}'`);
teste('organização da Guri foi apagada', (await count(`select count(*) n from public.organizations where id = '${orgB}'`)) === 0);
teste('contas da Guri foram apagadas em cascata', (await count(`select count(*) n from public.social_accounts where organization_id = '${orgB}'`)) === 0);

await como(null);
console.log(`\nResultado: ${ok} ok, ${falhas} falha(s)`);
process.exit(falhas ? 1 : 0);
