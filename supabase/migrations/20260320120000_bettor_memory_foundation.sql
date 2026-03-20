create extension if not exists pgcrypto;

alter table if exists public.profiles
  add column if not exists display_name text,
  add column if not exists timezone text default 'UTC',
  add column if not exists preferred_sportsbooks text[] not null default '{}',
  add column if not exists bettor_identity text,
  add column if not exists advisory_signals text[] not null default '{}',
  add column if not exists historical_aggregates jsonb not null default '{}'::jsonb;

create table if not exists public.bettor_artifacts (
  artifact_id uuid primary key default gen_random_uuid(),
  bettor_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null,
  object_url text,
  artifact_type text not null check (artifact_type in ('slip_screenshot', 'account_activity_screenshot', 'bet_result_screenshot', 'unknown_betting_artifact')),
  source_sportsbook text,
  upload_timestamp timestamptz not null default timezone('utc', now()),
  parse_status text not null default 'pending' check (parse_status in ('pending', 'parsed', 'partial', 'failed')),
  parser_version text,
  confidence_score numeric(5,4),
  verification_status text not null default 'unverified' check (verification_status in ('verified', 'unverified', 'needs_review')),
  raw_extracted_text text,
  raw_parse_json jsonb,
  preview_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.bettor_slips (
  slip_id uuid primary key default gen_random_uuid(),
  bettor_id uuid not null references public.profiles(id) on delete cascade,
  source_artifact_id uuid references public.bettor_artifacts(artifact_id) on delete set null,
  sportsbook text,
  placed_at timestamptz,
  settled_at timestamptz,
  stake numeric(12,2),
  payout numeric(12,2),
  potential_payout numeric(12,2),
  odds numeric(10,4),
  status text not null default 'unknown' check (status in ('open', 'won', 'lost', 'pushed', 'cashed_out', 'partial', 'unknown')),
  leg_count integer not null default 0,
  sport text,
  league text,
  confidence_score numeric(5,4),
  parse_quality text not null default 'pending' check (parse_quality in ('pending', 'parsed', 'partial', 'failed')),
  verification_status text not null default 'unverified' check (verification_status in ('verified', 'unverified', 'needs_review')),
  raw_source_reference text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.bettor_slip_legs (
  leg_id uuid primary key default gen_random_uuid(),
  slip_id uuid not null references public.bettor_slips(slip_id) on delete cascade,
  player_name text,
  team_name text,
  market_type text,
  line numeric(10,2),
  over_under_or_side text,
  odds numeric(10,4),
  result text check (result in ('won', 'lost', 'pushed', 'unknown')),
  event_descriptor text,
  sport text,
  league text,
  confidence_score numeric(5,4),
  verification_status text not null default 'unverified' check (verification_status in ('verified', 'unverified', 'needs_review')),
  normalized_market_label text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.bettor_account_activity_imports (
  activity_import_id uuid primary key default gen_random_uuid(),
  bettor_id uuid not null references public.profiles(id) on delete cascade,
  source_artifact_id uuid references public.bettor_artifacts(artifact_id) on delete set null,
  source_sportsbook text,
  beginning_balance numeric(12,2),
  end_balance numeric(12,2),
  deposited numeric(12,2),
  played_staked numeric(12,2),
  won_returned numeric(12,2),
  withdrawn numeric(12,2),
  rebated numeric(12,2),
  promotions_awarded numeric(12,2),
  promotions_played numeric(12,2),
  promotions_expired numeric(12,2),
  bets_placed integer,
  bets_won integer,
  activity_window_start timestamptz,
  activity_window_end timestamptz,
  verification_status text not null default 'unverified' check (verification_status in ('verified', 'unverified', 'needs_review')),
  parse_quality text not null default 'pending' check (parse_quality in ('pending', 'parsed', 'partial', 'failed')),
  confidence_score numeric(5,4),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.bettor_postmortems (
  postmortem_id uuid primary key default gen_random_uuid(),
  bettor_id uuid not null references public.profiles(id) on delete cascade,
  slip_id uuid not null references public.bettor_slips(slip_id) on delete cascade,
  outcome_summary text not null,
  weakest_leg_candidates text[] not null default '{}',
  strongest_legs text[] not null default '{}',
  correlated_risk_notes text[] not null default '{}',
  market_concentration_notes text[] not null default '{}',
  slip_size_notes text[] not null default '{}',
  confidence_score numeric(5,4),
  evidence jsonb not null default '[]'::jsonb,
  advisory_tags text[] not null default '{}',
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists bettor_artifacts_bettor_uploaded_idx on public.bettor_artifacts (bettor_id, upload_timestamp desc);
create index if not exists bettor_slips_bettor_created_idx on public.bettor_slips (bettor_id, created_at desc);
create index if not exists bettor_slips_status_idx on public.bettor_slips (bettor_id, status, settled_at desc);
create index if not exists bettor_slip_legs_slip_idx on public.bettor_slip_legs (slip_id);
create index if not exists bettor_activity_bettor_idx on public.bettor_account_activity_imports (bettor_id, created_at desc);
create index if not exists bettor_postmortems_bettor_idx on public.bettor_postmortems (bettor_id, created_at desc);

alter table if exists public.bettor_artifacts enable row level security;
alter table if exists public.bettor_slips enable row level security;
alter table if exists public.bettor_slip_legs enable row level security;
alter table if exists public.bettor_account_activity_imports enable row level security;
alter table if exists public.bettor_postmortems enable row level security;

drop policy if exists bettor_artifacts_owner_all on public.bettor_artifacts;
create policy bettor_artifacts_owner_all on public.bettor_artifacts for all using (bettor_id = auth.uid()) with check (bettor_id = auth.uid());

drop policy if exists bettor_slips_owner_all on public.bettor_slips;
create policy bettor_slips_owner_all on public.bettor_slips for all using (bettor_id = auth.uid()) with check (bettor_id = auth.uid());

drop policy if exists bettor_slip_legs_owner_all on public.bettor_slip_legs;
create policy bettor_slip_legs_owner_all on public.bettor_slip_legs for all using (exists (select 1 from public.bettor_slips s where s.slip_id = bettor_slip_legs.slip_id and s.bettor_id = auth.uid())) with check (exists (select 1 from public.bettor_slips s where s.slip_id = bettor_slip_legs.slip_id and s.bettor_id = auth.uid()));

drop policy if exists bettor_activity_owner_all on public.bettor_account_activity_imports;
create policy bettor_activity_owner_all on public.bettor_account_activity_imports for all using (bettor_id = auth.uid()) with check (bettor_id = auth.uid());

drop policy if exists bettor_postmortems_owner_all on public.bettor_postmortems;
create policy bettor_postmortems_owner_all on public.bettor_postmortems for all using (bettor_id = auth.uid()) with check (bettor_id = auth.uid());

insert into storage.buckets (id, name, public)
values ('bettor-artifacts', 'bettor-artifacts', false)
on conflict (id) do nothing;
