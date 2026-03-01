import { SPINE_KEYS, normalizeSpine, serializeSpine, type QuerySpine } from '@/src/core/nervous/spine';

const SPINE_KEY_SET = new Set<string>(SPINE_KEYS);

export function toHref(path: string, spine: QuerySpine, overrides?: Partial<QuerySpine> & Record<string, string | number | undefined>) {
  const next = normalizeSpine({ ...(spine as Record<string, string | undefined>), ...(overrides as Record<string, string | undefined>) });
  const serialized = serializeSpine(next);
  const params = new URLSearchParams(serialized);
  for (const [key, value] of Object.entries(overrides ?? {})) {
    if (value === undefined || value === null || value === '') continue;
    if (SPINE_KEY_SET.has(key)) continue;
    params.set(key, String(value));
  }
  const q = params.toString();
  return q ? `${path}?${q}` : path;
}
