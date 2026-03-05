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
const MODE_VALUES: Mode[] = ['live', 'cache', 'demo'];

const TZ_ALIASES: Record<string, string> = {
  ET: 'America/New_York',
  EST: 'America/New_York',
  CT: 'America/Chicago',
  MT: 'America/Denver',
  MST: 'America/Phoenix',
  PT: 'America/Los_Angeles',
  PST: 'America/Los_Angeles',
};

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

export type SpineNormalizationResult = {
  spine: Spine;
  warnings: string[];
};

function resolveTz(input: string | undefined, warnings: string[]): string {
  if (!input) return DEFAULT_SPINE.tz;
  const direct = input.trim();
  const alias = TZ_ALIASES[direct.toUpperCase()];
  if (alias) {
    warnings.push(`tz_invalid:${direct}->${alias}`);
    return alias;
  }

  try {
    Intl.DateTimeFormat('en-US', { timeZone: direct }).format(new Date());
    return direct;
  } catch {
    warnings.push(`tz_invalid:${direct}->${DEFAULT_SPINE.tz}`);
    return DEFAULT_SPINE.tz;
  }
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function coerceIsoDate(input?: string, tz?: string): string {
  const safeTz = tz && tz.trim().length > 0 ? tz : DEFAULT_SPINE.tz;
  const fallback = todayInTz(safeTz);
  const normalized = input?.trim();
  if (!normalized || normalized === 'YYYY-MM-DD') return fallback;
  return ISO_DATE_RE.test(normalized) ? normalized : fallback;
}

function resolveDate(input: string | undefined, tz: string, warnings: string[]): string {
  const fallback = todayInTz(tz);
  if (!input || input === 'YYYY-MM-DD') {
    if (input === 'YYYY-MM-DD') warnings.push('date_defaulted');
    return fallback;
  }
  if (ISO_DATE_RE.test(input)) return input;
  warnings.push('date_defaulted');
  return fallback;
}

function resolveMode(input: string | undefined, warnings: string[]): Mode {
  if (!input) return DEFAULT_SPINE.mode;
  const lowered = input.toLowerCase();
  if (MODE_VALUES.includes(lowered as Mode)) return lowered as Mode;
  warnings.push(`mode_invalid:${input}->${DEFAULT_SPINE.mode}`);
  return DEFAULT_SPINE.mode;
}

export function normalizeSpineWithWarnings(input: unknown): SpineNormalizationResult {
  const record = asRecord(input);
  const warnings: string[] = [];
  const trace_id = clean(record.trace_id ?? record.traceId ?? record.trace) ?? undefined;
  const sport = (clean(record.sport) ?? DEFAULT_SPINE.sport).toUpperCase();
  const tz = resolveTz(clean(record.tz), warnings);
  const date = resolveDate(clean(record.date), tz, warnings);
  const mode = resolveMode(clean(record.mode), warnings);
  const tab = clean(record.tab) ?? undefined;

  const parse = SpineSchema.safeParse({ trace_id, sport, tz, date, mode, tab });
  if (parse.success) return { spine: parse.data, warnings };

  warnings.push('spine_invalid:defaulted');
  return {
    spine: {
      ...DEFAULT_SPINE,
      sport,
      trace_id,
      tab,
      tz,
      mode,
      date,
    },
    warnings,
  };
}

export function normalizeSpine(input: unknown): Spine {
  return normalizeSpineWithWarnings(input).spine;
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
