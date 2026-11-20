-- Análise das Redes Sociais: esquema, isolamento por organização (RLS) e cofre de tokens.
-- Para o projeto Supabase do painel (ggphrgfgckpsspbsguhp). Rodar no SQL Editor, o arquivo inteiro de uma vez.
--
-- Regras de acesso:
--   - Toda tabela de dados tem organization_id. RLS só deixa o usuário ver e alterar o que a
--     organização dele permite (papéis: owner > admin > editor > viewer).
--   - Dados que vêm da Meta (contas, posts, métricas, público, logs de sincronização) são gravados
--     só pelo servidor, com a chave service_role (que ignora RLS). Usuários autenticados leem;
--     nunca escrevem nessas tabelas.
--   - Tokens da Meta (social_tokens) são cifrados pela aplicação (lib/token-vault.js). Nenhum papel
--     do Supabase exposto à API (anon ou authenticated) tem acesso à tabela.
--   - Não toca nas tabelas do painel atual (painel_gilson_state etc.).

-- ── Funções utilitárias ──────────────────────────────────────────────────────

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ── Usuários (espelho de auth.users) ─────────────────────────────────────────

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger users_touch before update on public.users
  for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Quem já existia antes desta migration também ganha linha em public.users.
insert into public.users (id, email, name)
select id, email, coalesce(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name')
from auth.users
on conflict (id) do nothing;

-- ── Organizações e membros ───────────────────────────────────────────────────

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 2 and 120),
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger organizations_touch before update on public.organizations
  for each row execute function public.touch_updated_at();

create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null default 'viewer' check (role in ('owner', 'admin', 'editor', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create index if not exists organization_members_user_idx on public.organization_members (user_id);

-- Pertencer à organização (e, opcionalmente, ter um dos papéis). Security definer: a checagem
-- de RLS nas outras tabelas não pode depender de RLS de organization_members (evita recursão).
create or replace function public.is_org_member(p_org uuid, p_roles text[] default null)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = p_org
      and m.user_id = auth.uid()
      and (p_roles is null or m.role = any (p_roles))
  );
$$;

revoke execute on function public.is_org_member(uuid, text[]) from public, anon;
grant execute on function public.is_org_member(uuid, text[]) to authenticated;

-- Única forma de criar organização pela API: quem cria vira owner.
create or replace function public.create_organization(p_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'não autenticado' using errcode = '28000';
  end if;
  insert into public.organizations (name, created_by)
  values (btrim(p_name), v_uid)
  returning id into v_id;
  insert into public.organization_members (organization_id, user_id, role)
  values (v_id, v_uid, 'owner');
  return v_id;
end $$;

revoke execute on function public.create_organization(text) from public, anon;
grant execute on function public.create_organization(text) to authenticated;

-- Não deixa a organização ficar sem owner (remover ou rebaixar o último).
-- Quando a própria organização está sendo apagada (cascade), a linha da organização já não existe
-- e o bloqueio não se aplica.
create or replace function public.keep_one_owner()
returns trigger language plpgsql as $$
begin
  if (tg_op = 'UPDATE' and old.role = 'owner' and new.role <> 'owner')
     or (tg_op = 'DELETE' and old.role = 'owner') then
    if exists (select 1 from public.organizations where id = old.organization_id)
       and (select count(*) from public.organization_members
            where organization_id = old.organization_id and role = 'owner') <= 1 then
      raise exception 'a organização precisa de pelo menos um owner' using errcode = '23514';
    end if;
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end $$;

create trigger organization_members_keep_owner
  before update or delete on public.organization_members
  for each row execute function public.keep_one_owner();

-- ── Contas conectadas (Instagram profissional e Página do Facebook) ─────────

create table if not exists public.social_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  platform text not null check (platform in ('instagram', 'facebook')),
  external_id text not null,
  parent_external_id text,
  username text,
  display_name text,
  status text not null default 'active' check (status in ('active', 'expired', 'revoked', 'error')),
  connected_by uuid references public.users(id) on delete set null,
  connected_at timestamptz not null default now(),
  last_synced_at timestamptz,
  unique (organization_id, platform, external_id)
);

create index if not exists social_accounts_org_idx on public.social_accounts (organization_id);

-- Tokens da Meta: texto cifrado pela aplicação. Sem políticas e sem grants para anon/authenticated.
create table if not exists public.social_tokens (
  social_account_id uuid primary key references public.social_accounts(id) on delete cascade,
  access_token_encrypted text not null check (access_token_encrypted like 'v1.%'),
  token_expires_at timestamptz,
  scopes text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger social_tokens_touch before update on public.social_tokens
  for each row execute function public.touch_updated_at();

-- ── Publicações e métricas ───────────────────────────────────────────────────

create table if not exists public.social_posts (
  id uuid primary key default gen_random_uuid(),
  social_account_id uuid not null references public.social_accounts(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  external_id text not null,
  content_type text not null check (content_type in ('post', 'reel', 'story', 'carousel', 'video', 'other')),
  media_type text,
  permalink text,
  thumbnail_url text,
  caption text,
  published_at timestamptz not null,
  synced_at timestamptz not null default now(),
  unique (social_account_id, external_id)
);

create index if not exists social_posts_org_published_idx on public.social_posts (organization_id, published_at desc);
create index if not exists social_posts_account_published_idx on public.social_posts (social_account_id, published_at desc);

create table if not exists public.post_insights (
  id bigserial primary key,
  social_post_id uuid not null references public.social_posts(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  collected_at timestamptz not null default now(),
  reach integer check (reach is null or reach >= 0),
  impressions integer check (impressions is null or impressions >= 0),
  views integer check (views is null or views >= 0),
  likes integer check (likes is null or likes >= 0),
  comments integer check (comments is null or comments >= 0),
  shares integer check (shares is null or shares >= 0),
  saves integer check (saves is null or saves >= 0),
  engagement integer check (engagement is null or engagement >= 0),
  follows_gained integer check (follows_gained is null or follows_gained >= 0)
);

create index if not exists post_insights_post_idx on public.post_insights (social_post_id, collected_at desc);
create index if not exists post_insights_org_idx on public.post_insights (organization_id, collected_at desc);

create table if not exists public.account_insights (
  id bigserial primary key,
  social_account_id uuid not null references public.social_accounts(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  metric_date date not null,
  reach integer check (reach is null or reach >= 0),
  impressions integer check (impressions is null or impressions >= 0),
  engagement integer check (engagement is null or engagement >= 0),
  profile_views integer check (profile_views is null or profile_views >= 0),
  followers_count integer check (followers_count is null or followers_count >= 0),
  follows_gained integer check (follows_gained is null or follows_gained >= 0),
  follows_lost integer check (follows_lost is null or follows_lost >= 0),
  website_clicks integer check (website_clicks is null or website_clicks >= 0),
  unique (social_account_id, metric_date)
);

create index if not exists account_insights_org_idx on public.account_insights (organization_id, metric_date desc);

create table if not exists public.audience_insights (
  id bigserial primary key,
  social_account_id uuid not null references public.social_accounts(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  snapshot_date date not null,
  dimension text not null check (dimension in ('age_gender', 'city', 'country', 'hour')),
  dimension_key text not null check (length(dimension_key) between 1 and 120),
  value numeric not null check (value >= 0),
  unique (social_account_id, snapshot_date, dimension, dimension_key)
);

create index if not exists audience_insights_account_idx on public.audience_insights (social_account_id, snapshot_date desc);

-- ── Concorrentes (somente dados públicos) ────────────────────────────────────

create table if not exists public.competitor_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  platform text not null default 'instagram' check (platform = 'instagram'),
  handle text not null check (handle ~ '^[A-Za-z0-9._]{1,30}$'),
  display_name text,
  added_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (organization_id, platform, handle)
);

create table if not exists public.competitor_snapshots (
  id bigserial primary key,
  competitor_id uuid not null references public.competitor_accounts(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  captured_at timestamptz not null default now(),
  followers_count integer check (followers_count is null or followers_count >= 0),
  media_count integer check (media_count is null or media_count >= 0),
  source text not null check (source in ('business_discovery', 'manual')),
  note text check (note is null or length(note) <= 300)
);

create index if not exists competitor_snapshots_competitor_idx on public.competitor_snapshots (competitor_id, captured_at desc);

-- ── Inteligência artificial ──────────────────────────────────────────────────

create table if not exists public.ai_analyses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  social_account_id uuid references public.social_accounts(id) on delete set null,
  requested_by uuid references public.users(id) on delete set null,
  kind text not null check (kind in ('post', 'weekly', 'monthly', 'question')),
  period_start date,
  period_end date,
  input_summary jsonb not null default '{}'::jsonb,
  output text,
  status text not null check (status in ('ok', 'insufficient_data', 'error')),
  model text,
  created_at timestamptz not null default now(),
  check (period_start is null or period_end is null or period_start <= period_end)
);

create index if not exists ai_analyses_org_idx on public.ai_analyses (organization_id, created_at desc);

-- ── Relatórios agendados ─────────────────────────────────────────────────────

create table if not exists public.scheduled_reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (length(btrim(name)) between 2 and 120),
  frequency text not null check (frequency in ('weekly', 'monthly', 'custom')),
  period_days integer not null check (period_days between 1 and 365),
  formats text[] not null default '{pdf}' check (cardinality(formats) > 0 and formats <@ array['pdf', 'csv']::text[]),
  recipients text[] not null default '{}' check (cardinality(recipients) <= 20),
  next_run_at timestamptz,
  last_run_at timestamptz,
  active boolean not null default true,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger scheduled_reports_touch before update on public.scheduled_reports
  for each row execute function public.touch_updated_at();

create index if not exists scheduled_reports_due_idx on public.scheduled_reports (next_run_at) where active;
create index if not exists scheduled_reports_org_idx on public.scheduled_reports (organization_id);

-- ── Log de sincronização ─────────────────────────────────────────────────────

create table if not exists public.synchronization_logs (
  id bigserial primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  social_account_id uuid references public.social_accounts(id) on delete set null,
  job text not null check (job in ('account_insights', 'posts', 'post_insights', 'audience', 'competitors', 'token_refresh')),
  origin text not null check (origin in ('cron', 'manual', 'connect')),
  status text not null default 'running' check (status in ('running', 'ok', 'partial', 'error')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  records_written integer not null default 0 check (records_written >= 0),
  error_message text check (error_message is null or length(error_message) <= 500)
);

create index if not exists synchronization_logs_org_idx on public.synchronization_logs (organization_id, started_at desc);
create index if not exists synchronization_logs_account_idx on public.synchronization_logs (social_account_id, started_at desc);

-- ── RLS ──────────────────────────────────────────────────────────────────────

alter table public.users enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.social_accounts enable row level security;
alter table public.social_tokens enable row level security;
alter table public.social_posts enable row level security;
alter table public.post_insights enable row level security;
alter table public.account_insights enable row level security;
alter table public.audience_insights enable row level security;
alter table public.competitor_accounts enable row level security;
alter table public.competitor_snapshots enable row level security;
alter table public.ai_analyses enable row level security;
alter table public.scheduled_reports enable row level security;
alter table public.synchronization_logs enable row level security;

-- users: cada um vê e edita só a própria linha.
create policy users_select_own on public.users for select to authenticated
  using (id = auth.uid());
create policy users_update_own on public.users for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- organizations: membros leem; admin/owner editam; só owner exclui. Criação só pela função.
create policy organizations_select on public.organizations for select to authenticated
  using (public.is_org_member(id));
create policy organizations_update on public.organizations for update to authenticated
  using (public.is_org_member(id, array['owner', 'admin']))
  with check (public.is_org_member(id, array['owner', 'admin']));
create policy organizations_delete on public.organizations for delete to authenticated
  using (public.is_org_member(id, array['owner']));

-- organization_members: membros leem; admin convida (sem criar owner); só owner promove a owner;
-- admin não mexe em owner.
create policy members_select on public.organization_members for select to authenticated
  using (public.is_org_member(organization_id));
create policy members_insert on public.organization_members for insert to authenticated
  with check (
    public.is_org_member(organization_id, array['owner'])
    or (public.is_org_member(organization_id, array['admin']) and role <> 'owner')
  );
create policy members_update on public.organization_members for update to authenticated
  using (
    public.is_org_member(organization_id, array['owner'])
    or (public.is_org_member(organization_id, array['admin']) and role <> 'owner')
  )
  with check (
    public.is_org_member(organization_id, array['owner'])
    or (public.is_org_member(organization_id, array['admin']) and role <> 'owner')
  );
create policy members_delete on public.organization_members for delete to authenticated
  using (
    public.is_org_member(organization_id, array['owner'])
    or (public.is_org_member(organization_id, array['admin']) and role <> 'owner')
  );

-- Dados da Meta: só leitura para membros (escrita é do servidor, service_role).
create policy social_accounts_select on public.social_accounts for select to authenticated
  using (public.is_org_member(organization_id));
create policy social_posts_select on public.social_posts for select to authenticated
  using (public.is_org_member(organization_id));
create policy post_insights_select on public.post_insights for select to authenticated
  using (public.is_org_member(organization_id));
create policy account_insights_select on public.account_insights for select to authenticated
  using (public.is_org_member(organization_id));
create policy audience_insights_select on public.audience_insights for select to authenticated
  using (public.is_org_member(organization_id));
create policy ai_analyses_select on public.ai_analyses for select to authenticated
  using (public.is_org_member(organization_id));
create policy synchronization_logs_select on public.synchronization_logs for select to authenticated
  using (public.is_org_member(organization_id, array['owner', 'admin']));

-- Concorrentes: editor+ cadastra e remove; snapshots manuais só pelo editor+.
create policy competitor_accounts_select on public.competitor_accounts for select to authenticated
  using (public.is_org_member(organization_id));
create policy competitor_accounts_write on public.competitor_accounts for all to authenticated
  using (public.is_org_member(organization_id, array['owner', 'admin', 'editor']))
  with check (public.is_org_member(organization_id, array['owner', 'admin', 'editor']));
create policy competitor_snapshots_select on public.competitor_snapshots for select to authenticated
  using (public.is_org_member(organization_id));
create policy competitor_snapshots_insert_manual on public.competitor_snapshots for insert to authenticated
  with check (source = 'manual' and public.is_org_member(organization_id, array['owner', 'admin', 'editor']));

-- Relatórios agendados: editor+ gerencia.
create policy scheduled_reports_select on public.scheduled_reports for select to authenticated
  using (public.is_org_member(organization_id));
create policy scheduled_reports_write on public.scheduled_reports for all to authenticated
  using (public.is_org_member(organization_id, array['owner', 'admin', 'editor']))
  with check (public.is_org_member(organization_id, array['owner', 'admin', 'editor']));

-- social_tokens: nenhuma política. Com RLS ligado e sem política, ninguém autenticado lê ou escreve.

-- ── Grants: anon nunca lê nem escreve; authenticated só o que a RLS permite ─

-- O Supabase dá todos os privilégios em tabelas novas a anon e authenticated por padrão. Tira tudo
-- e concede só o necessário; a RLS acima decide linha a linha.
revoke all on public.users, public.organizations, public.organization_members,
  public.social_accounts, public.social_tokens, public.social_posts, public.post_insights,
  public.account_insights, public.audience_insights, public.competitor_accounts,
  public.competitor_snapshots, public.ai_analyses, public.scheduled_reports,
  public.synchronization_logs from anon, authenticated;

grant select, update on public.users to authenticated;
grant select, update, delete on public.organizations to authenticated;
grant select, insert, update, delete on public.organization_members to authenticated;
grant select on public.social_accounts, public.social_posts, public.post_insights,
  public.account_insights, public.audience_insights, public.ai_analyses,
  public.synchronization_logs to authenticated;
grant select, insert, update, delete on public.competitor_accounts to authenticated;
grant select, insert on public.competitor_snapshots to authenticated;
grant select, insert, update, delete on public.scheduled_reports to authenticated;

-- Só a tabela que o usuário escreve precisa da sequência (as outras são escritas pelo servidor).
grant usage, select on sequence public.competitor_snapshots_id_seq to authenticated;
