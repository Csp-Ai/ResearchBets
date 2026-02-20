-- Sprint 1: security hardening + persistence alignment

create extension if not exists pgcrypto;

-- Ensure owner columns exist and can be set by auth
alter table if exists public.user_profiles
  add column if not exists user_id uuid,
  add column if not exists avatar_url text,
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

update public.user_profiles
set user_id = coalesce(user_id, id)
where user_id is null;

alter table if exists public.historical_bets
  add column if not exists user_id uuid,
  add column if not exists slip_text text,
  alter column created_at set default timezone('utc', now());

update public.historical_bets hb
set user_id = coalesce(hb.user_id, up.user_id, up.id)
from public.user_profiles up
where hb.profile_id = up.id
  and hb.user_id is null;

update public.historical_bets
set slip_text = coalesce(slip_text, bet_title, 'Bet record')
where slip_text is null;

alter table if exists public.historical_bets
  alter column user_id set default auth.uid();

alter table if exists public.community_posts
  add column if not exists user_id uuid,
  add column if not exists content text,
  add column if not exists sport text,
  add column if not exists league text,
  add column if not exists tags text[] default '{}';

update public.community_posts cp
set user_id = coalesce(cp.user_id, up.user_id, up.id)
from public.user_profiles up
where cp.profile_id = up.id
  and cp.user_id is null;

update public.community_posts
set content = coalesce(content, idea_text, body, '')
where content is null;

alter table if exists public.community_posts
  alter column user_id set default auth.uid();

alter table if exists public.research_reports
  add column if not exists user_id uuid;

alter table if exists public.research_reports
  alter column user_id set default auth.uid();

alter table if exists public.events_analytics
  add column if not exists actor_user_id uuid;

update public.events_analytics
set actor_user_id = case
  when user_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then user_id::uuid
  else null
end
where actor_user_id is null;

alter table if exists public.events_analytics
  alter column actor_user_id set default auth.uid();

-- Required indexes
create index if not exists events_analytics_trace_id_idx on public.events_analytics(trace_id);
create index if not exists events_analytics_timestamp_idx on public.events_analytics(timestamp desc);
create index if not exists events_analytics_trace_time_idx on public.events_analytics(trace_id, timestamp desc);

create index if not exists historical_bets_profile_id_idx on public.historical_bets(profile_id);
create index if not exists historical_bets_created_at_desc_idx on public.historical_bets(created_at desc);

-- RLS enablement
alter table if exists public.bets enable row level security;
alter table if exists public.events_analytics enable row level security;
alter table if exists public.research_reports enable row level security;
alter table if exists public.user_profiles enable row level security;
alter table if exists public.historical_bets enable row level security;
alter table if exists public.community_posts enable row level security;

-- Bets
 drop policy if exists "bets_owner_select" on public.bets;
 create policy "bets_owner_select" on public.bets for select using (auth.uid() = user_id);
 drop policy if exists "bets_owner_insert" on public.bets;
 create policy "bets_owner_insert" on public.bets for insert with check (auth.uid() = user_id);
 drop policy if exists "bets_owner_update" on public.bets;
 create policy "bets_owner_update" on public.bets for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
 drop policy if exists "bets_owner_delete" on public.bets;
 create policy "bets_owner_delete" on public.bets for delete using (auth.uid() = user_id);

-- Events analytics
 drop policy if exists "events_analytics_owner_select" on public.events_analytics;
 create policy "events_analytics_owner_select" on public.events_analytics for select using (auth.uid() = actor_user_id);
 drop policy if exists "events_analytics_owner_insert" on public.events_analytics;
 create policy "events_analytics_owner_insert" on public.events_analytics for insert with check (auth.uid() = actor_user_id);
 drop policy if exists "events_analytics_owner_update" on public.events_analytics;
 create policy "events_analytics_owner_update" on public.events_analytics for update using (auth.uid() = actor_user_id) with check (auth.uid() = actor_user_id);
 drop policy if exists "events_analytics_owner_delete" on public.events_analytics;
 create policy "events_analytics_owner_delete" on public.events_analytics for delete using (auth.uid() = actor_user_id);

-- Research reports
 drop policy if exists "research_reports_owner_select" on public.research_reports;
 create policy "research_reports_owner_select" on public.research_reports for select using (auth.uid() = user_id);
 drop policy if exists "research_reports_owner_insert" on public.research_reports;
 create policy "research_reports_owner_insert" on public.research_reports for insert with check (auth.uid() = user_id);
 drop policy if exists "research_reports_owner_update" on public.research_reports;
 create policy "research_reports_owner_update" on public.research_reports for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
 drop policy if exists "research_reports_owner_delete" on public.research_reports;
 create policy "research_reports_owner_delete" on public.research_reports for delete using (auth.uid() = user_id);

-- User profiles
 drop policy if exists "user_profiles_public_select" on public.user_profiles;
 create policy "user_profiles_public_select" on public.user_profiles for select using (true);
 drop policy if exists "user_profiles_owner_insert" on public.user_profiles;
 create policy "user_profiles_owner_insert" on public.user_profiles for insert with check (auth.uid() = user_id);
 drop policy if exists "user_profiles_owner_update" on public.user_profiles;
 create policy "user_profiles_owner_update" on public.user_profiles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
 drop policy if exists "user_profiles_owner_delete" on public.user_profiles;
 create policy "user_profiles_owner_delete" on public.user_profiles for delete using (auth.uid() = user_id);

-- Historical bets
 drop policy if exists "historical_bets_owner_select" on public.historical_bets;
 create policy "historical_bets_owner_select" on public.historical_bets for select using (auth.uid() = user_id);
 drop policy if exists "historical_bets_owner_insert" on public.historical_bets;
 create policy "historical_bets_owner_insert" on public.historical_bets for insert with check (auth.uid() = user_id);
 drop policy if exists "historical_bets_owner_update" on public.historical_bets;
 create policy "historical_bets_owner_update" on public.historical_bets for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
 drop policy if exists "historical_bets_owner_delete" on public.historical_bets;
 create policy "historical_bets_owner_delete" on public.historical_bets for delete using (auth.uid() = user_id);

-- Community posts
 drop policy if exists "community_posts_authed_or_public_select" on public.community_posts;
 create policy "community_posts_authed_or_public_select" on public.community_posts for select using (true);
 drop policy if exists "community_posts_owner_insert" on public.community_posts;
 create policy "community_posts_owner_insert" on public.community_posts for insert with check (auth.uid() = user_id);
 drop policy if exists "community_posts_owner_update" on public.community_posts;
 create policy "community_posts_owner_update" on public.community_posts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
 drop policy if exists "community_posts_owner_delete" on public.community_posts;
 create policy "community_posts_owner_delete" on public.community_posts for delete using (auth.uid() = user_id);
