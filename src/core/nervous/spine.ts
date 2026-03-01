export type SpineMode = 'live' | 'demo' | 'cache';

export type QuerySpine = {
  sport: string;
  tz: string;
  date: string;
  mode: SpineMode;
  trace_id?: string;
};

export const SPINE_KEYS = ['sport', 'tz', 'date', 'mode', 'trace_id'] as const;

const todayISO = () => new Date().toISOString().slice(0, 10);

export const DEFAULT_SPINE: QuerySpine = {
  sport: 'NBA',
  tz: 'America/Phoenix',
  date: todayISO(),
  mode: 'demo'
};

export function normalizeSpine(input?: Record<string, string | null | undefined>): QuerySpine {
  const sport = input?.sport?.toUpperCase() || DEFAULT_SPINE.sport;
  const tz = input?.tz || DEFAULT_SPINE.tz;
  const date = input?.date || DEFAULT_SPINE.date;
  const mode = input?.mode === 'live' ? 'live' : input?.mode === 'cache' ? 'cache' : 'demo';
  const trace_id = input?.trace_id ?? input?.trace ?? input?.traceId;
  return {
    sport,
    tz,
    date,
    mode,
    trace_id: trace_id || undefined
  };
}

export function parseSpineFromSearch(search: URLSearchParams | string): QuerySpine {
  const params = typeof search === 'string' ? new URLSearchParams(search.startsWith('?') ? search.slice(1) : search) : search;
  return normalizeSpine(Object.fromEntries(params.entries()));
}

export function serializeSpine(spine: QuerySpine): URLSearchParams {
  const normalized = normalizeSpine(spine as Record<string, string>);
  const params = new URLSearchParams();
  params.set('sport', normalized.sport);
  params.set('tz', normalized.tz);
  params.set('date', normalized.date);
  params.set('mode', normalized.mode);
  if (normalized.trace_id) params.set('trace_id', normalized.trace_id);
  return params;
}
