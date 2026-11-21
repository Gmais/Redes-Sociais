-- Fase 3: visualizações de Reels dos concorrentes (campo view_count da Business Discovery, só para Reels).
-- Colunas novas e opcionais: o código também funciona sem elas, então a migração pode ser aplicada depois.

alter table public.competitor_snapshots
  add column if not exists visualizacoes_reels_media numeric
    check (visualizacoes_reels_media is null or visualizacoes_reels_media >= 0),
  add column if not exists reels_com_views integer
    check (reels_com_views is null or reels_com_views >= 0);
