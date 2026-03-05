-- Add legacy-compatible date column for analytics writes/filters expecting events_analytics.date.
alter table if exists public.events_analytics
  add column if not exists date date;

update public.events_analytics
set date = coalesce(date, ("timestamp" at time zone 'UTC')::date)
where date is null;

create index if not exists idx_events_analytics_date
  on public.events_analytics (date desc);
