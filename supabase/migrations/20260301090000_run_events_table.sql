create table if not exists public.run_events (
  id uuid primary key default gen_random_uuid(),
  trace_id text not null,
  ts timestamptz not null default now(),
  type text not null,
  payload jsonb,
  spine jsonb
);

create index if not exists run_events_trace_id_ts_idx on public.run_events(trace_id, ts desc);

alter table public.run_events enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'run_events' and policyname = 'run_events_select_mvp'
  ) then
    create policy run_events_select_mvp on public.run_events for select using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'run_events' and policyname = 'run_events_insert_mvp'
  ) then
    create policy run_events_insert_mvp on public.run_events for insert with check (true);
  end if;
end $$;

comment on table public.run_events is 'MVP permissive policies; TODO tighten to authenticated owners by trace scope.';
