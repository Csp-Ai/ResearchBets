import { DEFAULT_SPINE, normalizeSpine } from '@/src/core/nervous/spine';

export type ContextSpine = {
  sport: string;
  tz: string;
  date: string;
  mode: 'live' | 'cache' | 'demo';
  reason?: string;
  trace_id?: string;
  anon_session_id?: string;
  slip_id?: string;
};

export function coerceContextSpine(input: Partial<ContextSpine>, fallback: ContextSpine): ContextSpine {
  return {
    sport: input.sport ?? fallback.sport,
    tz: input.tz ?? fallback.tz,
    date: input.date ?? fallback.date,
    mode: input.mode ?? fallback.mode,
    reason: input.reason ?? fallback.reason,
    trace_id: input.trace_id ?? fallback.trace_id,
    anon_session_id: input.anon_session_id ?? fallback.anon_session_id,
    slip_id: input.slip_id ?? fallback.slip_id,
  };
}

export function spineFromRequest(req: Request): Partial<ContextSpine> {
  const params = new URL(req.url).searchParams;
  // Accept query aliases used across existing routes/components.
  const normalized = normalizeSpine({
    sport: params.get('sport') ?? undefined,
    tz: params.get('tz') ?? undefined,
    date: params.get('date') ?? params.get('dateISO') ?? undefined,
    mode: params.get('mode') ?? undefined,
    trace_id: params.get('trace_id') ?? params.get('trace') ?? params.get('traceId') ?? undefined,
  });

  const slipId = params.get('slip_id') ?? params.get('slipId') ?? undefined;
  const anonSessionId = params.get('anon_session_id') ?? params.get('anon_id') ?? params.get('session_id') ?? undefined;
  const reason = params.get('reason') ?? undefined;

  return {
    sport: normalized.sport,
    tz: normalized.tz,
    date: normalized.date,
    mode: normalized.mode,
    trace_id: normalized.trace_id,
    slip_id: slipId,
    anon_session_id: anonSessionId,
    reason,
  };
}

export function spineToQuery(spine: ContextSpine): Record<string, string> {
  const safe = coerceContextSpine(spine, {
    ...DEFAULT_SPINE,
    reason: undefined,
    trace_id: undefined,
    anon_session_id: undefined,
    slip_id: undefined,
  });

  const query: Record<string, string> = {
    sport: safe.sport,
    tz: safe.tz,
    date: safe.date,
    mode: safe.mode,
  };

  if (safe.reason) query.reason = safe.reason;
  if (safe.trace_id) query.trace_id = safe.trace_id;
  if (safe.anon_session_id) query.anon_session_id = safe.anon_session_id;
  if (safe.slip_id) query.slip_id = safe.slip_id;

  return query;
}
