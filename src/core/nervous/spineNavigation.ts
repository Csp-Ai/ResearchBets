import { toHref } from '@/src/core/nervous/routes';
import { normalizeSpine, parseSpineFromSearch, type QuerySpine } from '@/src/core/nervous/spine';

export type SpineQuery = Record<string, string | number | undefined>;

const asSpineQuery = (extraQuery?: SpineQuery): SpineQuery | undefined => {
  if (!extraQuery) return undefined;
  return extraQuery;
};

const readClientSearchSpine = (): Partial<QuerySpine> => {
  if (typeof window === 'undefined') return {};
  return parseSpineFromSearch(new URLSearchParams(window.location.search));
};

const resolveSpine = (spine?: Partial<QuerySpine>): QuerySpine => normalizeSpine({
  ...readClientSearchSpine(),
  ...(spine ?? {})
});

export function spineHref(path: string, spine?: Partial<QuerySpine>, extraQuery?: SpineQuery) {
  return toHref(path, resolveSpine(spine), asSpineQuery(extraQuery));
}

export function spineApiUrl(pathStartingWithApi: `/api/${string}`, spine?: Partial<QuerySpine>, extraQuery?: SpineQuery) {
  return spineHref(pathStartingWithApi, spine, extraQuery);
}

export async function spineFetch(
  pathStartingWithApi: `/api/${string}`,
  options?: Omit<RequestInit, 'cache'> & {
    cache?: RequestCache;
    spine?: Partial<QuerySpine>;
    query?: SpineQuery;
  }
) {
  const url = spineApiUrl(pathStartingWithApi, options?.spine, options?.query);
  return fetch(url, {
    cache: options?.cache ?? 'no-store',
    ...options,
  });
}
