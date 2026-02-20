alter table if exists public.historical_bets
  add column if not exists status text not null default 'pending' check (status in ('pending', 'win', 'loss', 'void')),
  add column if not exists game_time timestamptz,
  add column if not exists game_id text,
  add column if not exists league text,
  add column if not exists gm_confidence numeric,
  add column if not exists agent_weights jsonb,
  add column if not exists black_swan_flag boolean not null default false,
  add column if not exists settlement_status text,
  add column if not exists settled_at timestamptz,
  add column if not exists outcome_metadata jsonb;

update public.historical_bets
set status = case
  when outcome in ('won', 'win') then 'win'
  when outcome in ('lost', 'loss') then 'loss'
  when outcome in ('void', 'push') then 'void'
  else 'pending'
end
where status is null;

create index if not exists historical_bets_pending_game_time_idx
  on public.historical_bets(status, game_time)
  where status = 'pending';

alter table if exists public.community_posts
  add column if not exists gm_confidence numeric,
  add column if not exists settlement_status text;

create index if not exists community_posts_created_at_desc_idx
  on public.community_posts(created_at desc);

create index if not exists community_posts_clone_created_idx
  on public.community_posts(clone_count desc, created_at desc);

create index if not exists community_posts_confidence_created_idx
  on public.community_posts(gm_confidence desc, created_at desc);

create table if not exists public.post_feedback (
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null,
  value text not null check (value in ('up', 'down')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (post_id, user_id)
);

alter table if exists public.post_feedback enable row level security;

drop policy if exists "post_feedback_owner_write" on public.post_feedback;
create policy "post_feedback_owner_write"
  on public.post_feedback
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "post_feedback_read_all" on public.post_feedback;
create policy "post_feedback_read_all"
  on public.post_feedback
  for select
  using (true);
