create table if not exists public.outcomes (
  id uuid primary key,
  run_id text not null,
  trace_id text not null,
  selection_key text not null,
  result text not null check (result in ('win', 'loss', 'push')),
  actual_value numeric,
  settled_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_outcomes_run_id on public.outcomes (run_id);
create index if not exists idx_outcomes_trace_id on public.outcomes (trace_id);
