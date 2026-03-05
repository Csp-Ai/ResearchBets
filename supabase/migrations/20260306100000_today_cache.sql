create table if not exists public.today_cache (
  cache_key text primary key,
  sport text not null,
  tz text not null,
  date text not null,
  payload jsonb not null,
  saved_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists today_cache_saved_at_idx on public.today_cache (saved_at desc);
