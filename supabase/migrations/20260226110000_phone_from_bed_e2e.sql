create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique not null,
  created_at timestamptz not null default now()
);

create table if not exists public.slips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source_type text not null check (source_type in ('self', 'shared')),
  raw_text text,
  raw_json jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.legs (
  id uuid primary key default gen_random_uuid(),
  slip_id uuid not null references public.slips (id) on delete cascade,
  sport text,
  league text,
  event_date timestamptz,
  team_or_player text,
  market_type text,
  line numeric,
  odds numeric,
  book text,
  created_at timestamptz not null default now()
);

create table if not exists public.settlements (
  id uuid primary key default gen_random_uuid(),
  slip_id uuid not null unique references public.slips (id) on delete cascade,
  status text not null check (status in ('pending', 'settled', 'partial', 'failed')) default 'pending',
  settled_at timestamptz,
  pnl numeric,
  notes text
);

create table if not exists public.leg_results (
  id uuid primary key default gen_random_uuid(),
  leg_id uuid not null unique references public.legs (id) on delete cascade,
  result text not null check (result in ('win', 'loss', 'push', 'unknown')),
  evidence_json jsonb,
  resolved_at timestamptz not null default now()
);

create table if not exists public.feedback_items (
  id uuid primary key default gen_random_uuid(),
  slip_id uuid not null references public.slips (id) on delete cascade,
  type text not null check (type in ('agent_feedback', 'note')),
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.slips enable row level security;
alter table public.legs enable row level security;
alter table public.settlements enable row level security;
alter table public.leg_results enable row level security;
alter table public.feedback_items enable row level security;

drop policy if exists profiles_owner_all on public.profiles;
create policy profiles_owner_all on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists slips_owner_all on public.slips;
create policy slips_owner_all on public.slips for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists legs_owner_all on public.legs;
create policy legs_owner_all on public.legs for all using (exists (
  select 1 from public.slips s where s.id = legs.slip_id and s.user_id = auth.uid()
)) with check (exists (
  select 1 from public.slips s where s.id = legs.slip_id and s.user_id = auth.uid()
));

drop policy if exists settlements_owner_all on public.settlements;
create policy settlements_owner_all on public.settlements for all using (exists (
  select 1 from public.slips s where s.id = settlements.slip_id and s.user_id = auth.uid()
)) with check (exists (
  select 1 from public.slips s where s.id = settlements.slip_id and s.user_id = auth.uid()
));

drop policy if exists leg_results_owner_all on public.leg_results;
create policy leg_results_owner_all on public.leg_results for all using (exists (
  select 1
  from public.legs l
  join public.slips s on s.id = l.slip_id
  where l.id = leg_results.leg_id and s.user_id = auth.uid()
)) with check (exists (
  select 1
  from public.legs l
  join public.slips s on s.id = l.slip_id
  where l.id = leg_results.leg_id and s.user_id = auth.uid()
));

drop policy if exists feedback_items_owner_all on public.feedback_items;
create policy feedback_items_owner_all on public.feedback_items for all using (exists (
  select 1 from public.slips s where s.id = feedback_items.slip_id and s.user_id = auth.uid()
)) with check (exists (
  select 1 from public.slips s where s.id = feedback_items.slip_id and s.user_id = auth.uid()
));
