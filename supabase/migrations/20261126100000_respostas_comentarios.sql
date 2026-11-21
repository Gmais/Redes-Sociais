-- Fase 2: respostas a comentários dos próprios posts.
-- Cada comentário vira uma linha, com categoria e rascunho. O envio só acontece quando a
-- Meta liberar a permissão de comentários (e a variável RESPOSTAS_ENVIO estiver "ligado").
-- Quem grava é o servidor (service role). Os membros só leem, como nas outras tabelas.

create table if not exists public.comentarios_respostas (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  social_account_id uuid not null references public.social_accounts(id) on delete cascade,
  social_post_id uuid not null references public.social_posts(id) on delete cascade,
  comment_external_id text not null,
  comment_texto text not null,
  comment_usuario text,
  comment_em timestamptz,
  categoria text not null check (categoria in ('agradecimento', 'emoji', 'pergunta', 'reclamacao', 'outro')),
  rascunho text,
  status text not null default 'pendente' check (status in ('pendente', 'aprovada', 'enviada', 'descartada', 'erro')),
  erro text,
  enviada_em timestamptz,
  criada_em timestamptz not null default now(),
  atualizada_em timestamptz not null default now(),
  unique (social_account_id, comment_external_id)
);

create index if not exists comentarios_respostas_org_status_idx
  on public.comentarios_respostas (organization_id, status, criada_em desc);

alter table public.comentarios_respostas enable row level security;

create policy comentarios_respostas_select on public.comentarios_respostas for select to authenticated
  using (public.is_org_member(organization_id));

grant select on public.comentarios_respostas to authenticated;
