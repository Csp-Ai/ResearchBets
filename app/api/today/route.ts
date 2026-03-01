import { NextResponse } from 'next/server';

import { normalizeSpine } from '@/src/core/nervous/spine';
import { getTraceContext } from '@/src/core/trace/getTraceContext.server';
import { createDemoTodayPayload } from '@/src/core/today/demoToday';
import { resolveToday } from '@/src/core/today/resolveToday.server';
import type { TodayPayload } from '@/src/core/today/types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const { spine } = getTraceContext(request);

    const forceRefresh = searchParams.get('refresh') === '1';
    const strictLive = searchParams.get('strict_live') === '1';

    let payload: TodayPayload;
    try {
      payload = await resolveToday({
        forceRefresh,
        strictLive,
        sport: spine.sport.toUpperCase() as 'NBA' | 'NFL' | 'NHL' | 'MLB' | 'UFC',
        tz: spine.tz,
        date: spine.date,
        mode: spine.mode
      });
    } catch (error) {
      if (spine.mode === 'demo') {
        payload = await resolveToday({ sport: spine.sport.toUpperCase() as 'NBA', tz: spine.tz, date: spine.date, mode: 'demo' });
      } else if (strictLive) {
        const generatedAt = new Date().toISOString();
        payload = {
          mode: 'live',
          generatedAt,
          leagues: [],
          games: [],
          board: [],
          reason: 'provider_unavailable',
          provenance: {
            mode: 'live',
            reason: 'provider_unavailable',
            generatedAt
          }
        };
      } else {
        throw error;
      }
    }

    const board = {
      games: payload.games,
      props: Array.isArray(payload.board) ? payload.board : []
    };

    const responseSpine = { ...spine };

    return NextResponse.json({
      ok: true,
      data: payload,
      trace_id: responseSpine.trace_id,
      landing: payload.landing,
      spine: responseSpine,
      provenance: payload.provenance ?? { mode: payload.mode, reason: payload.reason, generatedAt: payload.generatedAt },
      board
    });
  } catch {
    let fallbackSpine;
    try {
      fallbackSpine = getTraceContext(request).spine;
    } catch {
      fallbackSpine = normalizeSpine({});
    }

    const demoPayload = createDemoTodayPayload(fallbackSpine.sport);
    const board = {
      games: demoPayload.games,
      props: Array.isArray(demoPayload.board) ? demoPayload.board : []
    };

    return NextResponse.json({
      ok: true,
      data: demoPayload,
      trace_id: fallbackSpine.trace_id,
      landing: demoPayload.landing,
      spine: fallbackSpine,
      provenance: {
        mode: 'demo',
        reason: 'hard_error',
        generatedAt: demoPayload.generatedAt
      },
      board
    });
  }
}
