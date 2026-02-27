import { NextResponse } from 'next/server';

import { TodayPayloadSchema } from '@/src/core/contracts/envelopes';
import { coerceContextSpine, type ContextSpine } from '@/src/core/contracts/contextSpine';
import { normalizeTodayPayload } from '@/src/core/today/normalize';
import { getTraceContext } from '@/src/core/trace/getTraceContext.server';
import { getTodayPayload } from '@/src/core/today/service.server';

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
  const sport = readSport(trace.sport ?? searchParams.get('sport'));
  const tz = trace.tz;
  const date = trace.date ?? searchParams.get('date') ?? searchParams.get('dateISO') ?? undefined;

  const withSpine = (payload: { mode: 'live' | 'cache' | 'demo'; reason?: string }) => {
    const spine: ContextSpine = coerceContextSpine(
      { sport, tz, date, mode: payload.mode, reason: payload.reason, trace_id: trace.trace_id },
      { sport, tz, date: date ?? new Date().toISOString().slice(0, 10), mode: payload.mode },
    );
    return spine;
  };

  try {
    const payload = await getTodayPayload({ forceRefresh, sport, tz, date });
    const data = TodayPayloadSchema.parse(normalizeTodayPayload(payload));
    return NextResponse.json({ ok: true, data, provenance: data.provenance, trace_id: trace.trace_id, spine: withSpine(data), landing: payload.landing });
  } catch (error) {
    const generatedAt = new Date().toISOString();
    const data = TodayPayloadSchema.parse(normalizeTodayPayload({
      mode: 'live',
      reason: 'provider_unavailable',
      generatedAt,
      provenance: { mode: 'live', reason: 'provider_unavailable', generatedAt },
      games: [],
      board: [],
      status: 'market_closed',
      providerHealth: [{ provider: 'api', ok: false, message: error instanceof Error ? error.message : 'provider_unavailable' }]
    }));
    return NextResponse.json({ ok: true, data, provenance: data.provenance, trace_id: trace.trace_id, spine: withSpine(data) });
  }
}
