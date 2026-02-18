const ANON_SESSION_STORAGE_KEY = 'rb.anonSessionId';

export const getStoredAnonSessionId = (): string | null => {
  if (typeof window === 'undefined') return null;
  const value = window.localStorage.getItem(ANON_SESSION_STORAGE_KEY);
  return value && value.trim().length > 0 ? value : null;
};

export const ensureAnonSessionId = (): string => {
  const existing = getStoredAnonSessionId();
  if (existing) return existing;
  const generated = crypto.randomUUID();
  window.localStorage.setItem(ANON_SESSION_STORAGE_KEY, generated);
  return generated;
};

export const createClientRequestId = (): string => crypto.randomUUID();

export const hasPlaceholderIdentifier = (value: string): boolean => {
  const normalized = value.toLowerCase();
  return ['unknown-user', 'trace-ui', 'run-ui', 'log-bet-demo'].includes(normalized);
};
