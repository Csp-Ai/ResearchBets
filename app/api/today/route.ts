import { NextResponse } from 'next/server';

import { TodayPayloadSchema } from '@/src/core/contracts/envelopes';
import { coerceContextSpine, type ContextSpine } from '@/src/core/contracts/contextSpine';
import { normalizeTodayPayload } from '@/src/core/today/normalize';
import { getTraceContext } from '@/src/core/trace/getTraceContext.server';
import { resolveToday } from '@/src/core/today/resolveToday.server';

type Source = 'live' | 'cache' | 'demo';

const LIVE_SPORTS = ['NBA', 'NFL', 'NHL', 'MLB', 'UFC'] as const;
type LiveSport = (typeof LIVE_SPORTS)[number];

const readSport = (value: string | null): LiveSport => {
  const upper = (value ?? 'NBA').toUpperCase();
  return (LIVE_SPORTS.includes(upper as LiveSport) ? upper : 'NBA') as LiveSport;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const trace = getTraceContext(request);
  const forceRefresh = searchParams.get('refresh') === '1';
  const strictLive = searchParams.get('strict_live') === '1';
  const sport = readSport(trace.sport ?? searchParams.get('sport'));
  const tz = trace.tz;
  const date = trace.date ?? searchParams.get('date') ?? searchParams.get('dateISO') ?? undefined;
  const requestedMode = searchParams.get('mode') === 'demo' ? 'demo' : 'live';

  const withSpine = (payload: { mode: 'live' | 'cache' | 'demo'; reason?: string }) => {
    const spine: ContextSpine = coerceContextSpine(
      { sport, tz, date, mode: payload.mode, reason: payload.reason, trace_id: trace.trace_id },
      { sport, tz, date: date ?? new Date().toISOString().slice(0, 10), mode: payload.mode },
    );
    return spine;
  };

  try {
    const payload = await resolveToday({ forceRefresh, sport, tz, date, mode: requestedMode, strictLive });
    const data = TodayPayloadSchema.parse(normalizeTodayPayload(payload));
    const source: Source = data.mode;
    const degraded = requestedMode === 'live' && source !== 'live';
    return NextResponse.json({ ok: true, data, source, degraded, provenance: data.provenance, trace_id: data.trace_id ?? trace.trace_id, traceId: data.trace_id ?? trace.trace_id, spine: withSpine(data), landing: payload.landing });
  } catch {
    const payload = await resolveToday({ sport, tz, date, mode: 'demo' });
    const data = TodayPayloadSchema.parse(normalizeTodayPayload(payload));
    return NextResponse.json({ ok: true, data, source: 'demo', degraded: requestedMode === 'live', provenance: data.provenance, trace_id: data.trace_id ?? trace.trace_id, traceId: data.trace_id ?? trace.trace_id, spine: withSpine(data), landing: payload.landing });
  }
}
