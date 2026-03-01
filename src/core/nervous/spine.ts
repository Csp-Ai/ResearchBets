import { z } from 'zod';

export type Mode = 'live' | 'cache' | 'demo';
export type SpineMode = Mode;

export type Spine = {
  trace_id?: string;
  sport: string;
  tz: string;
  date: string;
  mode: Mode;
  tab?: string;
};

export type QuerySpine = Spine;

export const SPINE_KEYS = ['trace_id', 'sport', 'tz', 'date', 'mode', 'tab'] as const;

export const SpineSchema = z.object({
  trace_id: z.string().min(1).optional(),
  sport: z.string().min(1),
  tz: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mode: z.enum(['live', 'cache', 'demo']),
  tab: z.string().min(1).optional()
});

const DEFAULT_TZ = 'America/Phoenix';

const todayInTz = (tz: string) => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const parts = formatter.formatToParts(new Date());
  const year = parts.find((part) => part.type === 'year')?.value ?? '1970';
  const month = parts.find((part) => part.type === 'month')?.value ?? '01';
  const day = parts.find((part) => part.type === 'day')?.value ?? '01';
  return `${year}-${month}-${day}`;
};

const asRecord = (input: unknown): Record<string, string | null | undefined> => {
  if (!input || typeof input !== 'object') return {};
  return input as Record<string, string | null | undefined>;
};

const clean = (value: string | null | undefined) => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export const DEFAULT_SPINE: Spine = {
  sport: 'NBA',
  tz: DEFAULT_TZ,
  date: todayInTz(DEFAULT_TZ),
  mode: 'live',
  trace_id: undefined,
  tab: undefined
};

export function normalizeSpine(input: unknown): Spine {
  const record = asRecord(input);
  const trace_id = clean(record.trace_id ?? record.traceId ?? record.trace) ?? undefined;
  const sport = (clean(record.sport) ?? DEFAULT_SPINE.sport).toUpperCase();
  const tz = clean(record.tz) ?? DEFAULT_SPINE.tz;
  const date = clean(record.date) ?? todayInTz(tz);
  const modeInput = clean(record.mode);
  const mode: Mode = modeInput === 'demo' || modeInput === 'cache' || modeInput === 'live' ? modeInput : DEFAULT_SPINE.mode;
  const tab = clean(record.tab) ?? undefined;

  return SpineSchema.parse({ trace_id, sport, tz, date, mode, tab });
}

export function parseSpineFromSearch(sp: URLSearchParams): Partial<Spine> {
  return {
    trace_id: sp.get('trace_id') ?? sp.get('traceId') ?? undefined,
    sport: sp.get('sport') ?? undefined,
    tz: sp.get('tz') ?? undefined,
    date: sp.get('date') ?? undefined,
    mode: (sp.get('mode') as Mode | null) ?? undefined,
    tab: sp.get('tab') ?? undefined
  };
}

export function serializeSpine(spine: Spine): Record<string, string> {
  const normalized = normalizeSpine(spine);
  const query: Record<string, string> = {};
  for (const key of SPINE_KEYS) {
    const value = normalized[key];
    if (value === null || value === undefined || value === '') continue;
    query[key] = String(value);
  }
  return query;
}
