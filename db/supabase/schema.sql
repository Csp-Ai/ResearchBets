create extension if not exists "pgcrypto";

create table if not exists public.bets (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  sport text not null,
  market text not null,
  selection text not null,
  odds_american integer not null check (odds_american <= -100 or odds_american >= 100),
  stake numeric(12,2) not null check (stake > 0),
  potential_payout numeric(12,2) not null check (potential_payout > 0),
  event_starts_at timestamptz not null,
  status text not null check (status in ('open', 'settled')) default 'open',
  outcome text check (outcome in ('won', 'lost', 'push')),
  placed_at timestamptz not null default now(),
  settled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bets_session_id_idx on public.bets (session_id);
create index if not exists bets_status_idx on public.bets (status);
create index if not exists bets_event_starts_at_idx on public.bets (event_starts_at);

create or replace function public.set_updated_at_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger bets_set_updated_at
before update on public.bets
for each row
execute function public.set_updated_at_timestamp();
