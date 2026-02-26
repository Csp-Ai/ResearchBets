export type RedirectSearchParams = Record<string, string | string[] | undefined> | undefined;

export function buildRedirectWithQuery(pathname: string, searchParams: RedirectSearchParams): string {
  const query = new URLSearchParams();

  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (Array.isArray(value)) {
        value.filter((item): item is string => typeof item === 'string').forEach((item) => query.append(key, item));
        continue;
      }

      if (typeof value === 'string') {
        query.set(key, value);
      }
    }
  }

  const queryString = query.toString();
  return queryString ? `${pathname}?${queryString}` : pathname;
}
