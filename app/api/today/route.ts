import { NextResponse } from 'next/server';

import { normalizeSpine } from '@/src/core/nervous/spine';
import { getTraceContext } from '@/src/core/trace/getTraceContext.server';
import { computeProviderHealth } from '@/src/core/health/providerHealth.server';
import { parseUrlModeIntent, resolveRuntimeMode } from '@/src/core/live/runtimeMode';
import { createDemoTodayPayload } from '@/src/core/today/demoToday';
import { resolveToday } from '@/src/core/today/resolveToday.server';
import type { TodayPayload } from '@/src/core/today/types';


const LIVE_STEPS = [
  'resolve_context',
  'events_fetch',
  'odds_fetch',
  'stats_fetch',
  'normalize',
  'board_build',
  'min_row_checks',
  'live_viability',
] as const;

type LiveStep = (typeof LIVE_STEPS)[number];

function parseWarningStep(providerWarnings: string[] = []): LiveStep | undefined {
  const withStep = providerWarnings.find((warning) => warning.startsWith('live_unavailable:non_error_throw:') || warning.startsWith('live_hard_error:'));
  if (!withStep) return undefined;
  const step = withStep.split(':').at(-1);
  if (!step) return undefined;
  return (LIVE_STEPS as readonly string[]).includes(step) ? (step as LiveStep) : undefined;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const { spine, warnings: contextWarnings } = getTraceContext(request);

    const urlIntent = parseUrlModeIntent(searchParams);
    const providerHealth = await computeProviderHealth({ sport: spine.sport });
    const resolvedMode = resolveRuntimeMode({ urlIntent, providerHealth });

    const forceRefresh = searchParams.get('refresh') === '1';
    const strictLive = searchParams.get('strict_live') === '1';
    const debugEnabled = searchParams.get('debug') === '1';

    let payload: TodayPayload;
    try {
      payload = await resolveToday({
        forceRefresh,
        strictLive,
        sport: spine.sport.toUpperCase() as 'NBA' | 'NFL' | 'NHL' | 'MLB' | 'UFC',
        tz: spine.tz,
        date: spine.date,
        mode: resolvedMode.mode
      });
    } catch (error) {
      if (resolvedMode.mode === 'demo') {
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

    const responseSpine = { ...spine, mode: resolvedMode.mode };

    const modeAlignedPayload = {
      ...payload,
      reason: payload.reason ?? resolvedMode.reason,
      provenance: payload.provenance ?? {
        mode: payload.mode,
        reason: payload.reason ?? resolvedMode.reason,
        generatedAt: payload.generatedAt,
      },
      landing: payload.landing ?? {
        mode: payload.mode,
        reason: payload.mode === 'live' ? 'live_ok' : 'demo',
        gamesCount: payload.games.length,
        lastUpdatedAt: payload.generatedAt,
      },
    } as TodayPayload;

    const withContextWarnings = contextWarnings.length > 0
      ? {
        ...modeAlignedPayload,
        providerWarnings: [...(modeAlignedPayload.providerWarnings ?? []), ...contextWarnings]
      }
      : modeAlignedPayload;


    const board = {
      games: withContextWarnings.games,
      props: Array.isArray(withContextWarnings.board) ? withContextWarnings.board : []
    };

    const warningStep = parseWarningStep(withContextWarnings.providerWarnings ?? []);
    const sanitizedDebug = payload.debug
      ? {
        ...payload.debug,
        step: warningStep && payload.debug.step === 'resolve_context' ? warningStep : payload.debug.step,
      }
      : undefined;

    const responseBody = {
      ok: true,
      data: withContextWarnings,
      trace_id: responseSpine.trace_id,
      landing: withContextWarnings.landing,
      spine: responseSpine,
      provenance: withContextWarnings.provenance ?? { mode: withContextWarnings.mode, reason: withContextWarnings.reason, generatedAt: withContextWarnings.generatedAt },
      board,
      ...(debugEnabled && sanitizedDebug ? { debug: sanitizedDebug } : {})
    };

    return NextResponse.json(responseBody);
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
