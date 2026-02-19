-- Expose a safe metadata inspection RPC for public table columns.

create or replace function public.inspect_public_columns(tables text[])
returns table(table_name text, column_name text)
language sql
security definer
set search_path = public, pg_catalog, information_schema
as $$
  select c.table_name::text, c.column_name::text
  from information_schema.columns as c
  where c.table_schema = 'public'
    and c.table_name = any(coalesce(tables, array[]::text[]));
$$;

revoke all on function public.inspect_public_columns(text[]) from public;
grant execute on function public.inspect_public_columns(text[]) to anon;
grant execute on function public.inspect_public_columns(text[]) to authenticated;
grant execute on function public.inspect_public_columns(text[]) to service_role;
