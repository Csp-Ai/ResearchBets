import { NextResponse } from 'next/server';

import { getTraceContext } from '@/src/core/trace/getTraceContext.server';
import { resolveToday } from '@/src/core/today/resolveToday.server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const { spine } = getTraceContext(request);

  const forceRefresh = searchParams.get('refresh') === '1';
  const strictLive = searchParams.get('strict_live') === '1';

  let payload;
  try {
    payload = await resolveToday({
      forceRefresh,
      strictLive,
      sport: spine.sport.toUpperCase() as 'NBA' | 'NFL' | 'NHL' | 'MLB' | 'UFC',
      tz: spine.tz,
      date: spine.date,
      mode: spine.mode
    });
  } catch {
    payload = await resolveToday({ sport: spine.sport.toUpperCase() as 'NBA', tz: spine.tz, date: spine.date, mode: 'demo' });
  }

  const board = {
    games: payload.games,
    props: Array.isArray(payload.board) ? payload.board : []
  };

  const responseSpine = { ...spine, mode: payload.mode };

  return NextResponse.json({
    ok: true,
    data: payload,
    trace_id: responseSpine.trace_id,
    landing: payload.landing,
    spine: responseSpine,
    provenance: payload.provenance ?? { mode: payload.mode, reason: payload.reason },
    board
  });
}
