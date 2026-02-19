type Entry<T> = {
  value: T;
  expiresAt: number;
};

const TRUSTED_CTX_NS = 'trustedctx:v1';
const trustedContextCache = new Map<string, Entry<unknown>>();

export const TRUSTED_CONTEXT_TTL_MS = {
  injuriesGameDay: 10 * 60 * 1000,
  injuriesDefault: 30 * 60 * 1000,
  transactions: 30 * 60 * 1000,
  scheduleSpot: 6 * 60 * 60 * 1000,
  oddsGameDay: 60 * 1000,
  oddsDefault: 5 * 60 * 1000
} as const;

const cacheKey = (scope: string): string => `${TRUSTED_CTX_NS}:${scope}`;

export const getTrustedContextCache = <T>(scope: string): T | null => {
  const key = cacheKey(scope);
  const hit = trustedContextCache.get(key);
  if (!hit) return null;
  if (hit.expiresAt <= Date.now()) {
    trustedContextCache.delete(key);
    return null;
  }
  return hit.value as T;
};

export const setTrustedContextCache = <T>(scope: string, value: T, ttlMs: number): T => {
  trustedContextCache.set(cacheKey(scope), { value, expiresAt: Date.now() + ttlMs });
  return value;
};

