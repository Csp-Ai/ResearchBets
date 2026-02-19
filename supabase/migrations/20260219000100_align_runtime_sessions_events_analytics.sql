-- Align runtime/session analytics tables to application runtime expectations.

create extension if not exists "pgcrypto";

create table if not exists public.runtime_sessions (
  session_id text primary key,
  user_id text not null,
  last_seen_at timestamptz not null default now()
);

alter table if exists public.runtime_sessions
  add column if not exists session_id text,
  add column if not exists user_id text,
  add column if not exists last_seen_at timestamptz default now();

update public.runtime_sessions
set last_seen_at = coalesce(last_seen_at, now())
where last_seen_at is null;

create index if not exists idx_runtime_sessions_last_seen_at
  on public.runtime_sessions (last_seen_at desc);

create table if not exists public.events_analytics (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  timestamp timestamptz not null default now(),
  request_id text not null,
  trace_id text not null,
  run_id text,
  session_id text,
  user_id text,
  agent_id text not null,
  model_version text not null,
  confidence double precision,
  assumptions jsonb,
  properties jsonb not null default '{}'::jsonb
);

alter table if exists public.events_analytics
  add column if not exists event_name text,
  add column if not exists timestamp timestamptz,
  add column if not exists request_id text,
  add column if not exists trace_id text,
  add column if not exists run_id text,
  add column if not exists session_id text,
  add column if not exists user_id text,
  add column if not exists agent_id text,
  add column if not exists model_version text,
  add column if not exists confidence double precision,
  add column if not exists assumptions jsonb,
  add column if not exists properties jsonb;

-- Compatibility with legacy events_analytics schema variants.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'events_analytics'
      and column_name = 'properties_json'
  ) then
    update public.events_analytics
    set properties = coalesce(properties, properties_json)
    where properties is null;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'events_analytics'
      and column_name = 'created_at'
  ) then
    update public.events_analytics
    set "timestamp" = coalesce("timestamp", created_at)
    where "timestamp" is null;
  end if;
end $$;

update public.events_analytics
set properties = '{}'::jsonb
where properties is null;

update public.events_analytics
set "timestamp" = coalesce("timestamp", now())
where "timestamp" is null;

create or replace function public.sync_events_analytics_timestamp()
returns trigger
language plpgsql
as $$
begin
  if new."timestamp" is null then
    if to_jsonb(new) ? 'created_at' then
      new."timestamp" := coalesce((to_jsonb(new)->>'created_at')::timestamptz, now());
    else
      new."timestamp" := now();
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_events_analytics_timestamp on public.events_analytics;

create trigger trg_events_analytics_timestamp
before insert or update on public.events_analytics
for each row
execute function public.sync_events_analytics_timestamp();

create index if not exists idx_events_analytics_trace_id
  on public.events_analytics (trace_id);

create index if not exists idx_events_analytics_timestamp
  on public.events_analytics ("timestamp" desc);

create index if not exists idx_events_analytics_agent_id
  on public.events_analytics (agent_id);

-- Bets compatibility checks for fields selected/upserted by runtime store.
alter table if exists public.bets
  add column if not exists user_id text,
  add column if not exists session_id text,
  add column if not exists snapshot_id text,
  add column if not exists trace_id text,
  add column if not exists run_id text,
  add column if not exists selection text,
  add column if not exists game_id text,
  add column if not exists market_type text,
  add column if not exists line numeric,
  add column if not exists book text,
  add column if not exists odds_format text,
  add column if not exists price numeric,
  add column if not exists odds numeric,
  add column if not exists recommended_id uuid,
  add column if not exists followed_ai boolean not null default false,
  add column if not exists placed_line numeric,
  add column if not exists placed_price numeric,
  add column if not exists placed_odds numeric,
  add column if not exists closing_line numeric,
  add column if not exists closing_price numeric,
  add column if not exists clv_line numeric,
  add column if not exists clv_price numeric,
  add column if not exists stake numeric(12,2),
  add column if not exists status text,
  add column if not exists outcome text,
  add column if not exists settled_profit numeric,
  add column if not exists confidence numeric,
  add column if not exists created_at timestamptz default now(),
  add column if not exists settled_at timestamptz,
  add column if not exists resolution_reason text,
  add column if not exists source_url text,
  add column if not exists source_domain text;

create index if not exists idx_bets_status_created_at
  on public.bets (status, created_at desc);
