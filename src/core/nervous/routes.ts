import { normalizeSpine, serializeSpine, type QuerySpine } from '@/src/core/nervous/spine';

export function toHref(path: string, spine: QuerySpine, overrides?: Partial<QuerySpine> & Record<string, string | number | undefined>) {
  const next = normalizeSpine({ ...(spine as Record<string, string | undefined>), ...(overrides as Record<string, string | undefined>) });
  const params = serializeSpine(next);
  for (const [key, value] of Object.entries(overrides ?? {})) {
    if (value === undefined || value === null || value === '') continue;
    if (key in next) continue;
    params.set(key, String(value));
  }
  const q = params.toString();
  return q ? `${path}?${q}` : path;
}
