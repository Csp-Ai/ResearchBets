export function appendQuery(href: string, params: Record<string, string | number | undefined>) {
  const [pathWithQuery = '', hash = ''] = href.split('#');
  const [path, query = ''] = pathWithQuery.split('?');
  const searchParams = new URLSearchParams(query);

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    searchParams.set(key, String(value));
  }

  const nextQuery = searchParams.toString();
  const nextHash = hash ? `#${hash}` : '';
  return `${path}${nextQuery ? `?${nextQuery}` : ''}${nextHash}`;
}
