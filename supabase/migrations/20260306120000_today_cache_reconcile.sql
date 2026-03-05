create table if not exists public.today_cache (
  cache_key text,
  payload jsonb,
  saved_at timestamptz not null default timezone('utc'::text, now())
);

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'today_cache'
  ) then
    if not exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'today_cache'
        and column_name = 'sport'
    ) then
      alter table public.today_cache add column sport text;
    end if;

    if not exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'today_cache'
        and column_name = 'tz'
    ) then
      alter table public.today_cache add column tz text;
    end if;

    if not exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'today_cache'
        and column_name = 'date'
    ) then
      alter table public.today_cache add column date text;
    end if;
  end if;
end
$$;

update public.today_cache
set
  sport = coalesce(sport, nullif(split_part(cache_key, ':', 2), '')),
  tz = coalesce(tz, nullif(split_part(cache_key, ':', 3), '')),
  date = coalesce(date, nullif(split_part(cache_key, ':', 4), ''))
where cache_key like 'today:%:%:%'
  and (sport is null or tz is null or date is null);

do $$
begin
  if exists (
    select 1
    from public.today_cache
    where sport is null
      or tz is null
      or date is null
  ) then
    raise notice 'today_cache contains rows with null sport/tz/date after backfill; leaving columns nullable for safety';
  else
    alter table public.today_cache alter column sport set not null;
    alter table public.today_cache alter column tz set not null;
    alter table public.today_cache alter column date set not null;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.today_cache'::regclass
      and contype = 'p'
  ) then
    alter table public.today_cache add constraint today_cache_pkey primary key (cache_key);
  end if;
end
$$;

create index if not exists today_cache_saved_at_desc_idx_v2 on public.today_cache (saved_at desc);
