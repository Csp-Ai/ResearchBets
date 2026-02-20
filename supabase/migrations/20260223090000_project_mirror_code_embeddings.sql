create extension if not exists vector;
create extension if not exists pgcrypto;

create table if not exists public.code_embeddings (
  id uuid primary key default gen_random_uuid(),
  path text not null,
  content text not null,
  embedding vector(1536) not null,
  metadata jsonb not null default '{}'::jsonb,
  checksum text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists code_embeddings_path_idx on public.code_embeddings(path);

create unique index if not exists code_embeddings_dedupe_idx
  on public.code_embeddings (
    path,
    (metadata ->> 'chunk_type'),
    checksum,
    (metadata ->> 'start_line'),
    (metadata ->> 'end_line')
  );

create index if not exists code_embeddings_embedding_idx
  on public.code_embeddings
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

alter table if exists public.code_embeddings enable row level security;

drop policy if exists "code_embeddings_service_role_access" on public.code_embeddings;
create policy "code_embeddings_service_role_access"
  on public.code_embeddings
  for all
  to service_role
  using (true)
  with check (true);

create or replace function public.match_code(
  query_embedding vector(1536),
  match_count int,
  path_prefix text default null
)
returns table (
  id uuid,
  path text,
  content text,
  metadata jsonb,
  checksum text,
  similarity float
)
language sql
stable
as $$
  select
    ce.id,
    ce.path,
    ce.content,
    ce.metadata,
    ce.checksum,
    1 - (ce.embedding <=> query_embedding) as similarity
  from public.code_embeddings ce
  where path_prefix is null or ce.path like path_prefix || '%'
  order by ce.embedding <=> query_embedding asc
  limit greatest(match_count, 1);
$$;
