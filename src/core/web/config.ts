const parseCsv = (value: string | undefined): string[] =>
  (value ?? '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

const parseRateLimits = (value: string | undefined): Record<string, number> => {
  if (!value) return {};
  try {
    return JSON.parse(value) as Record<string, number>;
  } catch {
    return {};
  }
};

export const walConfig = {
  allowlist: parseCsv(process.env.WAL_ALLOWLIST),
  blocklist: parseCsv(process.env.WAL_BLOCKLIST),
  rateLimitsMs: parseRateLimits(process.env.WAL_RATE_LIMITS_JSON),
  oddsStalenessMs: Number(process.env.WAL_ODDS_STALENESS_MS ?? 5 * 60_000),
  newsStalenessMs: Number(process.env.WAL_NEWS_STALENESS_MS ?? 6 * 60 * 60_000),
  resultsStalenessMs: Number(process.env.WAL_RESULTS_STALENESS_MS ?? 2 * 60 * 60_000),
  parserVersion: process.env.WAL_PARSER_VERSION ?? 'wal-v1',
  maxRetries: Number(process.env.WAL_MAX_RETRIES ?? 3),
  timeoutMs: Number(process.env.WAL_TIMEOUT_MS ?? 5_000),
};
