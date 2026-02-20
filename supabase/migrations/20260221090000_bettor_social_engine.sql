create table if not exists public.agent_performance (
  id uuid primary key default gen_random_uuid(),
  agent_id text not null,
  league text not null,
  accuracy_score numeric not null default 0,
  total_predictions integer not null default 0,
  updated_at timestamptz not null default timezone('utc', now()),
  unique (agent_id, league)
);

create table if not exists public.agent_performance_deltas (
  id uuid primary key default gen_random_uuid(),
  historical_bet_id uuid,
  agent_id text not null,
  league text not null,
  gm_confidence numeric not null,
  outcome text not null check (outcome in ('win', 'loss')),
  performance_delta numeric not null,
  created_at timestamptz not null default timezone('utc', now())
);

alter table if exists public.community_posts
  add column if not exists clone_count integer not null default 0,
  add column if not exists comment_count integer not null default 0,
  add column if not exists is_shared boolean not null default false,
  add column if not exists bet_details jsonb,
  add column if not exists historical_bet_id uuid references public.historical_bets(id) on delete set null;

create table if not exists public.community_post_likes (
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (post_id, user_id)
);

create or replace function public.increment_clone_count(p_post_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update public.community_posts
  set clone_count = clone_count + 1
  where id = p_post_id;
end;
$$;

create or replace function public.upsert_agent_performance(p_agent_id text, p_league text, p_accuracy_delta numeric)
returns void
language plpgsql
security definer
as $$
begin
  insert into public.agent_performance (agent_id, league, accuracy_score, total_predictions)
  values (p_agent_id, p_league, greatest(0, least(1, p_accuracy_delta + 0.5)), 1)
  on conflict (agent_id, league)
  do update set
    accuracy_score = greatest(0, least(1, ((agent_performance.accuracy_score * agent_performance.total_predictions) + (p_accuracy_delta + 0.5)) / (agent_performance.total_predictions + 1))),
    total_predictions = agent_performance.total_predictions + 1,
    updated_at = timezone('utc', now());
end;
$$;
