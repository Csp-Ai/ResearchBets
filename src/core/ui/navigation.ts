export function buildNavigationHref(input: {
  pathname: string;
  traceId: string;
  params?: Record<string, string | number | null | undefined>;
}): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(input.params ?? {})) {
    if (value === null || value === undefined || value === '') continue;
    query.set(key, String(value));
  }
  query.set('trace_id', input.traceId);
  const queryString = query.toString();
  return queryString ? `${input.pathname}?${queryString}` : input.pathname;
}
