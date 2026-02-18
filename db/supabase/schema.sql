create extension if not exists "pgcrypto";

create table if not exists public.bets (
  id uuid primary key default gen_random_uuid(),
  user_id text,
  session_id text not null,
  snapshot_id text,
  trace_id text,
  run_id text,
  selection text not null,
  game_id text,
  market_type text,
  line numeric,
  book text,
  odds numeric not null,
  recommended_id uuid,
  followed_ai boolean not null default false,
  placed_line numeric,
  placed_price numeric,
  closing_line numeric,
  closing_price numeric,
  clv_line numeric,
  clv_price numeric,
  stake numeric(12,2) not null,
  status text not null,
  outcome text,
  settled_profit numeric,
  confidence numeric,
  settled_at timestamptz,
  resolution_reason text,
  source_url text,
  source_domain text,
  created_at timestamptz not null default now()
);

create table if not exists public.recommendation_outcomes (
  id uuid primary key default gen_random_uuid(),
  recommendation_id uuid not null unique,
  game_id text not null,
  outcome text not null,
  closing_line numeric,
  closing_price numeric,
  clv_line numeric,
  clv_price numeric,
  settled_at timestamptz not null,
  resolution_reason text,
  source_url text,
  source_domain text
);

create table if not exists public.odds_snapshots (
  id uuid primary key default gen_random_uuid(),
  game_id text not null,
  market text not null,
  market_type text not null,
  selection text not null,
  line numeric,
  price numeric,
  book text not null,
  captured_at timestamptz not null,
  game_starts_at timestamptz,
  source_url text,
  source_domain text,
  fetched_at timestamptz not null,
  published_at timestamptz,
  parser_version text not null,
  checksum text not null,
  staleness_ms bigint not null default 0,
  freshness_score numeric(6,5) not null default 1,
  resolution_reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.game_results (
  id uuid primary key default gen_random_uuid(),
  game_id text not null unique,
  payload jsonb not null,
  completed_at timestamptz not null,
  is_final boolean not null default false,
  source_url text,
  source_domain text,
  fetched_at timestamptz not null,
  published_at timestamptz,
  parser_version text not null,
  checksum text not null,
  staleness_ms bigint not null default 0,
  freshness_score numeric(6,5) not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists public.web_cache (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  domain text not null,
  fetched_at timestamptz not null,
  status integer not null,
  etag text,
  last_modified text,
  content_hash text not null,
  response_body text not null,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists bets_status_idx on public.bets (status);
create index if not exists bets_game_id_idx on public.bets (game_id, created_at desc);
create index if not exists odds_snapshots_lookup_idx on public.odds_snapshots (game_id, market, selection, captured_at desc);
create index if not exists odds_snapshots_source_idx on public.odds_snapshots (source_domain, fetched_at desc);
create index if not exists game_results_lookup_idx on public.game_results (game_id, completed_at desc);
create index if not exists game_results_source_idx on public.game_results (source_domain, fetched_at desc);
create index if not exists web_cache_url_fetch_idx on public.web_cache (url, fetched_at desc);
create index if not exists web_cache_domain_fetch_idx on public.web_cache (domain, fetched_at desc);
