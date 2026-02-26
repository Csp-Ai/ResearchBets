import { NextResponse } from 'next/server';

import { coerceContextSpine, spineFromRequest, type ContextSpine } from '@/src/core/contracts/contextSpine';
import { fallbackToday } from '@/src/core/today/fallback';
import { normalizeTodayPayload } from '@/src/core/today/normalize';
import { getTodayPayload } from '@/src/core/today/service.server';

const LIVE_SPORTS = ['NBA', 'NFL', 'NHL', 'MLB', 'UFC'] as const;

type LiveSport = (typeof LIVE_SPORTS)[number];

const readSport = (value: string | null): LiveSport => {
  const upper = (value ?? 'NBA').toUpperCase();
  return (LIVE_SPORTS.includes(upper as LiveSport) ? upper : 'NBA') as LiveSport;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requestSpine = spineFromRequest(request);
  const forceRefresh = searchParams.get('refresh') === '1';
  const demoRequested = searchParams.get('demo') === '1';
  const sport = readSport(requestSpine.sport ?? searchParams.get('sport'));
  const tz = requestSpine.tz ?? 'America/Phoenix';
  const date = requestSpine.date ?? searchParams.get('date') ?? searchParams.get('dateISO') ?? undefined;
  const headerLiveMode = request.headers.get('x-live-mode') === '1';

  const withSpine = (payload: ReturnType<typeof normalizeTodayPayload>) => {
    const spine: ContextSpine = coerceContextSpine(
      {
        sport,
        tz,
        date,
        mode: payload.mode,
        reason: payload.reason,
        trace_id: requestSpine.trace_id,
        anon_session_id: requestSpine.anon_session_id,
      },
      {
        sport,
        tz,
        date: date ?? new Date().toISOString().slice(0, 10),
        mode: payload.mode,
      }
    );

    return spine;
  };

  try {
    if (headerLiveMode && !process.env.SPORTSDATAIO_API_KEY && !process.env.THEODDS_API_KEY) {
      const data = normalizeTodayPayload({
        ...fallbackToday({ sport, tz, date, mode: 'demo' }),
        mode: 'demo',
        reason: 'fallback_due_to_missing_keys'
      });
      return NextResponse.json({ ok: true, data, degraded: true, source: 'fallback', trace_id: requestSpine.trace_id, spine: withSpine(data) });
    }

    const payload = await getTodayPayload({ forceRefresh, demoRequested, sport, tz, date });
    const data = normalizeTodayPayload(payload);
    return NextResponse.json({ ok: true, data, degraded: data.mode !== 'live', source: payload.mode, trace_id: requestSpine.trace_id, spine: withSpine(data), landing: payload.landing });
  } catch {
    const data = normalizeTodayPayload({
      ...fallbackToday({ sport, tz, date, mode: 'demo' }),
      mode: 'demo',
      reason: 'fallback_due_to_provider_unavailable'
    });
    return NextResponse.json({ ok: true, data, degraded: true, source: 'fallback', error_code: 'today_provider_unavailable', trace_id: requestSpine.trace_id, spine: withSpine(data) });
  }
}
