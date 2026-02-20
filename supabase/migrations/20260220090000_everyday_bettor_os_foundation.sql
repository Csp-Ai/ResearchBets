create table if not exists public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  avatar_seed text,
  created_at timestamptz not null default now()
);

create table if not exists public.historical_bets (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.user_profiles(id) on delete set null,
  slip_text text not null,
  closing_line text,
  outcome text not null check (outcome in ('win', 'loss')),
  placed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.user_profiles(id) on delete set null,
  idea_text text not null,
  receipt_text text not null,
  created_at timestamptz not null default now()
);
