-- Fase 2 (DMs): respostas a quem escreveu para a conta, dentro da janela de 24 horas.
-- Cada mensagem recebida vira uma linha, com categoria e rascunho. O envio só acontece quando
-- a Meta liberar a permissão de mensagens (instagram_business_manage_messages) e a variável
-- DM_ENVIO estiver "ligado". Quem grava é o servidor (service role). Os membros só leem.

create table if not exists public.dm_respostas (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  social_account_id uuid not null references public.social_accounts(id) on delete cascade,
  conversa_id text not null,
  mensagem_external_id text not null,
  recebida_em timestamptz not null,
  remetente_id text not null,
  remetente_nome text,
  mensagem_texto text not null,
  categoria text not null check (categoria in ('agradecimento', 'emoji', 'pergunta', 'reclamacao', 'outro')),
  rascunho text,
  status text not null default 'pendente' check (status in ('pendente', 'aprovada', 'enviada', 'descartada', 'erro')),
  erro text,
  enviada_em timestamptz,
  criada_em timestamptz not null default now(),
  atualizada_em timestamptz not null default now(),
  unique (social_account_id, mensagem_external_id)
);

create index if not exists dm_respostas_org_status_idx
  on public.dm_respostas (organization_id, status, criada_em desc);

alter table public.dm_respostas enable row level security;

create policy dm_respostas_select on public.dm_respostas for select to authenticated
  using (public.is_org_member(organization_id));

grant select on public.dm_respostas to authenticated;
