-- Canonicalize analytics timestamps to created_at while preserving timestamp compatibility.

create extension if not exists "pgcrypto";

create table if not exists public.runtime_sessions (
  session_id text primary key,
  user_id text not null,
  last_seen_at timestamptz default now()
);

alter table if exists public.runtime_sessions
  add column if not exists last_seen_at timestamptz;

create index if not exists idx_runtime_sessions_last_seen_at
  on public.runtime_sessions (last_seen_at desc);

create table if not exists public.events_analytics (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  created_at timestamptz not null default now(),
  request_id text not null,
  trace_id text not null,
  run_id text,
  session_id text,
  user_id text,
  agent_id text,
  model_version text not null,
  confidence double precision,
  assumptions jsonb,
  properties jsonb not null default '{}'::jsonb
);

alter table if exists public.events_analytics
  add column if not exists created_at timestamptz,
  add column if not exists "timestamp" timestamptz,
  add column if not exists agent_id text,
  add column if not exists properties jsonb;

update public.events_analytics
set created_at = coalesce(created_at, "timestamp", now())
where created_at is null;

update public.events_analytics
set "timestamp" = coalesce("timestamp", created_at, now())
where "timestamp" is null;

update public.events_analytics
set properties = '{}'::jsonb
where properties is null;

create or replace function public.sync_events_analytics_timestamps()
returns trigger
language plpgsql
as $$
begin
  new.created_at := coalesce(new.created_at, new."timestamp", now());
  new."timestamp" := coalesce(new."timestamp", new.created_at, now());
  return new;
end;
$$;

drop trigger if exists trg_events_analytics_timestamps on public.events_analytics;

create trigger trg_events_analytics_timestamps
before insert or update on public.events_analytics
for each row
execute function public.sync_events_analytics_timestamps();

create index if not exists idx_events_analytics_created_at
  on public.events_analytics (created_at desc);

create index if not exists idx_events_analytics_timestamp
  on public.events_analytics ("timestamp" desc);

create index if not exists idx_events_analytics_agent_id
  on public.events_analytics (agent_id);
