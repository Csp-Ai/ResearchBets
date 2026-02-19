const ANALYTICS_TABLES = ['events_analytics', 'runtime_sessions'] as const;
const ANALYTICS_COLUMNS = ['agent_id', 'created_at', 'timestamp', 'last_seen_at'] as const;

const includesAny = (value: string, tokens: readonly string[]): boolean =>
  tokens.some((token) => value.includes(token));

const loggedDegradationErrors = new Set<string>();

export const isMissingAnalyticsSchemaError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;

  const payload = error as Record<string, unknown>;
  const code = String(payload.code ?? '').toUpperCase();
  const message = `${String(payload.message ?? '')} ${String(payload.details ?? '')} ${String(payload.hint ?? '')}`.toLowerCase();

  if (code === '42P01' && includesAny(message, ANALYTICS_TABLES)) return true;

  if ((code === '42703' || code === 'PGRST204') && includesAny(message, ANALYTICS_COLUMNS)) {
    return true;
  }

  if ((code === '42703' || code === 'PGRST204') && includesAny(message, ANALYTICS_TABLES)) {
    return true;
  }

  return false;
};

export const logAnalyticsSchemaDegradationOnce = (context: string, error: unknown): void => {
  const payload = error as Record<string, unknown> | undefined;
  const code = String(payload?.code ?? 'UNKNOWN');
  const message = String(payload?.message ?? 'Unknown analytics schema error');
  const key = `${context}:${code}:${message}`;

  if (loggedDegradationErrors.has(key)) return;

  loggedDegradationErrors.add(key);
  console.warn(`⚠️ ${context} degraded on analytics schema error [${code}] ${message}`);
};
