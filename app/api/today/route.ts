import { NextResponse } from 'next/server';

import { normalizeSpine } from '@/src/core/nervous/spine';
import { getTraceContext } from '@/src/core/trace/getTraceContext.server';
import { createDemoTodayPayload } from '@/src/core/today/demoToday';
import { resolveToday } from '@/src/core/today/resolveToday.server';

export async function GET(request: Request) {
  try {
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
  } catch {
    let fallbackSpine;
    try {
      fallbackSpine = getTraceContext(request).spine;
    } catch {
      fallbackSpine = normalizeSpine({});
    }

    const demoPayload = createDemoTodayPayload();
    const board = {
      games: demoPayload.games,
      props: Array.isArray(demoPayload.board) ? demoPayload.board : []
    };

    return NextResponse.json({
      ok: true,
      data: demoPayload,
      trace_id: fallbackSpine.trace_id,
      landing: demoPayload.landing,
      spine: { ...fallbackSpine, mode: 'demo' },
      provenance: {
        mode: 'demo',
        reason: 'hard_error',
        generatedAt: demoPayload.generatedAt
      },
      board
    });
  }
}
