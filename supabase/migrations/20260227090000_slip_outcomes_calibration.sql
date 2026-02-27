create table if not exists public.slip_outcomes (
  id uuid primary key,
  trace_id text not null,
  run_id text not null,
  user_id text,
  verdict_internal text not null check (verdict_internal in ('KEEP', 'MODIFY', 'PASS')),
  verdict_presented text not null check (verdict_presented in ('TAKE', 'MODIFY', 'PASS')),
  confidence_score numeric not null,
  fragility_score numeric not null,
  correlation_score numeric not null,
  weakest_leg text not null,
  top_reasons text[] not null default '{}',
  final_outcome text not null check (final_outcome in ('WIN', 'LOSS', 'PUSH')),
  hit_weakest_leg boolean not null default false,
  verdict_correct boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_slip_outcomes_trace_id on public.slip_outcomes (trace_id);
create index if not exists idx_slip_outcomes_created_at on public.slip_outcomes (created_at desc);
