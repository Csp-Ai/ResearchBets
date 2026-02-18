-- Observability and KPI baseline schema
-- PostgreSQL / Supabase SQL

create extension if not exists pgcrypto;

create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  request_id text not null,
  user_id uuid,
  agent_id text not null,
  model_version text not null,
  timestamp timestamptz not null default timezone('utc', now()),
  invocation_started_at timestamptz not null,
  invocation_completed_at timestamptz,
  status text not null check (status in ('started', 'success', 'error', 'partial_error')),
  confidence numeric(5,4) check (confidence >= 0 and confidence <= 1),
  assumptions jsonb,
  input_type text,
  output_type text,
  error_code text,
  error_message text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_agent_runs_request_id on public.agent_runs (request_id);
create index if not exists idx_agent_runs_user_id on public.agent_runs (user_id);
create index if not exists idx_agent_runs_agent_id_timestamp on public.agent_runs (agent_id, timestamp desc);

create table if not exists public.agent_scores (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.agent_runs(id) on delete cascade,
  request_id text not null,
  user_id uuid,
  agent_id text not null,
  model_version text not null,
  timestamp timestamptz not null default timezone('utc', now()),
  decision_id text not null,
  market text not null,
  score numeric(6,5) not null,
  confidence numeric(5,4) not null check (confidence >= 0 and confidence <= 1),
  assumptions jsonb,
  rationale text,
  features jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_agent_scores_run_id on public.agent_scores (run_id);
create index if not exists idx_agent_scores_agent_id_timestamp on public.agent_scores (agent_id, timestamp desc);

create table if not exists public.bet_outcomes (
  id uuid primary key default gen_random_uuid(),
  request_id text,
  user_id uuid,
  agent_id text,
  model_version text,
  timestamp timestamptz not null default timezone('utc', now()),
  outcome_id text not null unique,
  run_id uuid references public.agent_runs(id) on delete set null,
  bet_id text not null,
  settlement_status text not null check (settlement_status in ('won', 'lost', 'void', 'pending')),
  pnl_amount numeric(12,2) not null default 0,
  odds numeric(8,4),
  confidence numeric(5,4) check (confidence >= 0 and confidence <= 1),
  assumptions jsonb,
  settled_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_bet_outcomes_user_id_timestamp on public.bet_outcomes (user_id, timestamp desc);
create index if not exists idx_bet_outcomes_run_id on public.bet_outcomes (run_id);

create table if not exists public.line_snapshots (
  id uuid primary key default gen_random_uuid(),
  request_id text,
  user_id uuid,
  agent_id text,
  model_version text,
  timestamp timestamptz not null default timezone('utc', now()),
  run_id uuid references public.agent_runs(id) on delete set null,
  sportsbook text not null,
  event_id text not null,
  market text not null,
  selection text,
  line_value numeric(10,4),
  odds numeric(8,4),
  confidence numeric(5,4) check (confidence >= 0 and confidence <= 1),
  assumptions jsonb,
  captured_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_line_snapshots_event_market on public.line_snapshots (event_id, market, captured_at desc);
create index if not exists idx_line_snapshots_run_id on public.line_snapshots (run_id);

create table if not exists public.user_kpi_daily (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  request_id text,
  user_id uuid not null,
  agent_id text,
  model_version text,
  timestamp timestamptz not null default timezone('utc', now()),
  dau_bettor boolean not null default false,
  research_queries integer not null default 0,
  slips_analyzed integer not null default 0,
  tracked_bets integer not null default 0,
  total_bets integer not null default 0,
  agent_decisions integer not null default 0,
  agent_correct integer not null default 0,
  mean_confidence numeric(5,4),
  confidence numeric(5,4) check (confidence >= 0 and confidence <= 1),
  assumptions jsonb,
  clv_delta numeric(12,2),
  created_at timestamptz not null default timezone('utc', now()),
  unique (date, user_id)
);

create index if not exists idx_user_kpi_daily_date on public.user_kpi_daily (date desc);
create index if not exists idx_user_kpi_daily_user_id_date on public.user_kpi_daily (user_id, date desc);

-- Core economic loop tables
create table if not exists public.profiles (
  user_id uuid primary key,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.research_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  session_id uuid not null,
  run_id text not null,
  trace_id text not null,
  confidence numeric(5,4),
  report_json jsonb not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.bets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  session_id uuid not null,
  snapshot_id uuid,
  run_id text,
  trace_id text,
  selection text not null,
  odds numeric(8,4) not null,
  stake numeric(12,2) not null,
  status text not null check (status in ('pending', 'settled')),
  outcome text check (outcome in ('won', 'lost', 'push')),
  settled_profit numeric(12,2),
  confidence numeric(5,4),
  created_at timestamptz not null default timezone('utc', now()),
  settled_at timestamptz
);

create table if not exists public.events_analytics (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  trace_id text not null,
  run_id text,
  session_id text not null,
  user_id text not null,
  properties_json jsonb not null,
  timestamp timestamptz not null
);

create table if not exists public.idempotency_keys (
  key text not null,
  endpoint text not null,
  user_id text not null,
  response_hash text not null,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (key, endpoint, user_id)
);
