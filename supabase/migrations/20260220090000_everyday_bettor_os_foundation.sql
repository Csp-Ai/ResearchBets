-- Everyday Bettor OS foundation: anonymous-first RLS and core social/history tables.

alter table if exists public.profiles
  add column if not exists id uuid,
  add column if not exists display_name text,
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

update public.profiles
set id = user_id
where id is null;

alter table if exists public.profiles
  alter column id set not null;

create unique index if not exists profiles_id_unique_idx on public.profiles (id);

create table if not exists public.historical_bets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bet_title text not null,
  stake numeric(12,2) not null,
  odds numeric(10,4) not null,
  outcome text not null default 'pending' check (outcome in ('pending', 'won', 'lost', 'void')),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists historical_bets_user_created_idx
  on public.historical_bets(user_id, created_at desc);

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  body text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists community_posts_created_idx on public.community_posts(created_at desc);

alter table if exists public.profiles enable row level security;
alter table if exists public.historical_bets enable row level security;
alter table if exists public.community_posts enable row level security;

drop policy if exists "profiles_public_select" on public.profiles;
create policy "profiles_public_select"
  on public.profiles
  for select
  using (true);

drop policy if exists "profiles_owner_update" on public.profiles;
create policy "profiles_owner_update"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "historical_bets_owner_select" on public.historical_bets;
create policy "historical_bets_owner_select"
  on public.historical_bets
  for select
  using (auth.uid() = user_id);

drop policy if exists "historical_bets_owner_insert" on public.historical_bets;
create policy "historical_bets_owner_insert"
  on public.historical_bets
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "community_posts_public_select" on public.community_posts;
create policy "community_posts_public_select"
  on public.community_posts
  for select
  using (true);

drop policy if exists "community_posts_authenticated_insert" on public.community_posts;
create policy "community_posts_authenticated_insert"
  on public.community_posts
  for insert
  to authenticated
  with check (auth.uid() = user_id or user_id is null);
