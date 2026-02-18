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


create table if not exists public.runtime_sessions (
  session_id text primary key,
  user_id text not null,
  last_seen_at timestamptz not null
);

create table if not exists public.research_reports (
  report_id text primary key,
  report jsonb not null,
  created_at timestamptz not null default timezone('utc', now())
);

alter table if exists public.idempotency_keys
  add column if not exists response_json jsonb;

-- Measurement engine tables
alter table if exists public.bets
  add column if not exists recommended_id uuid,
  add column if not exists followed_ai boolean not null default false,
  add column if not exists game_id text,
  add column if not exists market_type text,
  add column if not exists line numeric(10,4),
  add column if not exists placed_line numeric(10,4),
  add column if not exists placed_price numeric(10,4),
  add column if not exists closing_line numeric(10,4),
  add column if not exists closing_price numeric(10,4),
  add column if not exists clv_line numeric(12,6),
  add column if not exists clv_price numeric(12,6),
  add column if not exists placed_at timestamptz,
  add column if not exists book text,
  add constraint bets_market_type_check check (market_type in ('spread', 'total', 'moneyline'));

create table if not exists public.ai_recommendations (
  id uuid primary key default gen_random_uuid(),
  parent_recommendation_id uuid references public.ai_recommendations(id) on delete set null,
  group_id text,
  recommendation_type text not null check (recommendation_type in ('agent', 'final')),
  anon_session_id text,
  session_id text not null,
  user_id text,
  request_id text not null,
  trace_id text not null,
  run_id text not null,
  agent_id text not null,
  agent_version text not null,
  game_id text not null,
  market_type text not null check (market_type in ('spread', 'total', 'moneyline')),
  market text not null,
  selection text not null,
  line numeric(10,4),
  price numeric(10,4),
  confidence numeric(5,4) not null,
  rationale jsonb not null default '{}'::jsonb,
  evidence_refs jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_ai_recommendations_game_market on public.ai_recommendations(game_id, market, selection, created_at desc);
create index if not exists idx_ai_recommendations_trace on public.ai_recommendations(trace_id);

create table if not exists public.odds_snapshots (
  id uuid primary key default gen_random_uuid(),
  game_id text not null,
  market text not null,
  market_type text not null check (market_type in ('spread', 'total', 'moneyline')),
  selection text not null,
  line numeric(10,4),
  price numeric(10,4),
  book text not null,
  captured_at timestamptz not null,
  game_starts_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_odds_snapshots_lookup on public.odds_snapshots(game_id, market, selection, captured_at desc);

create table if not exists public.game_results (
  id uuid primary key default gen_random_uuid(),
  game_id text not null unique,
  payload jsonb not null,
  completed_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.recommendation_outcomes (
  id uuid primary key default gen_random_uuid(),
  recommendation_id uuid not null references public.ai_recommendations(id) on delete cascade,
  game_id text not null,
  outcome text not null check (outcome in ('won', 'lost', 'push', 'void')),
  closing_line numeric(10,4),
  closing_price numeric(10,4),
  clv_line numeric(12,6),
  clv_price numeric(12,6),
  settled_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique(recommendation_id)
);

create table if not exists public.experiments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.experiment_assignments (
  id uuid primary key default gen_random_uuid(),
  experiment_name text not null references public.experiments(name) on delete cascade,
  assignment text not null check (assignment in ('control', 'treatment')),
  subject_key text not null,
  user_id text,
  anon_session_id text,
  created_at timestamptz not null default timezone('utc', now()),
  unique(experiment_name, subject_key)
);

alter table public.ai_recommendations enable row level security;
alter table public.odds_snapshots enable row level security;
alter table public.game_results enable row level security;
alter table public.recommendation_outcomes enable row level security;
alter table public.experiment_assignments enable row level security;

create policy if not exists ai_recommendations_session_policy on public.ai_recommendations
  for all using (coalesce(auth.uid()::text, anon_session_id) = coalesce(user_id, anon_session_id))
  with check (coalesce(auth.uid()::text, anon_session_id) = coalesce(user_id, anon_session_id));

create policy if not exists experiment_assignments_subject_policy on public.experiment_assignments
  for all using (coalesce(auth.uid()::text, anon_session_id) = coalesce(user_id, anon_session_id))
  with check (coalesce(auth.uid()::text, anon_session_id) = coalesce(user_id, anon_session_id));


alter table if exists public.odds_snapshots
  add column if not exists consensus_level text not null default 'single_source',
  add column if not exists sources_used text[] not null default '{}',
  add column if not exists disagreement_score numeric not null default 0;

alter table if exists public.game_results
  add column if not exists consensus_level text not null default 'single_source',
  add column if not exists sources_used text[] not null default '{}',
  add column if not exists disagreement_score numeric not null default 0;

create table if not exists public.slip_submissions (
  id uuid primary key default gen_random_uuid(),
  anon_session_id text,
  user_id uuid,
  created_at timestamptz not null default now(),
  source text not null check (source in ('paste', 'upload')),
  raw_text text not null,
  parse_status text not null check (parse_status in ('received', 'parsed', 'failed')),
  extracted_legs jsonb,
  trace_id text not null,
  request_id text not null,
  checksum text not null
);

create index if not exists slip_submissions_anon_session_idx on public.slip_submissions (anon_session_id);
create index if not exists slip_submissions_created_at_idx on public.slip_submissions (created_at desc);
create index if not exists slip_submissions_checksum_idx on public.slip_submissions (checksum);
