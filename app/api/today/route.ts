import { NextResponse } from 'next/server';

import { coerceIsoDate, normalizeSpine } from '@/src/core/nervous/spine';
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

function alignTodayPayload(payload: TodayPayload, contextWarnings: string[], intent: NonNullable<TodayPayload['intent']>, fallbackReason?: string): TodayPayload {
  const effective = payload.effective ?? { mode: payload.mode, reason: payload.reason ?? fallbackReason };
  const mergedWarnings = [...(payload.providerWarnings ?? []), ...contextWarnings];

  return {
    ...payload,
    mode: effective.mode,
    reason: effective.reason ?? payload.reason ?? fallbackReason,
    intent,
    effective,
    provenance: payload.provenance ?? {
      mode: effective.mode,
      reason: effective.reason ?? payload.reason ?? fallbackReason,
      generatedAt: payload.generatedAt,
    },
    landing: payload.landing ?? {
      mode: effective.mode,
      reason: effective.mode === 'live' ? 'live_ok' : 'demo',
      gamesCount: payload.games.length,
      lastUpdatedAt: payload.generatedAt,
    },
    providerWarnings: mergedWarnings.length > 0 ? mergedWarnings : undefined,
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const { spine, warnings: contextWarnings } = getTraceContext(request);

    const urlIntent = parseUrlModeIntent(searchParams);
    const providerHealth = await computeProviderHealth({ sport: spine.sport });
    const resolvedMode = resolveRuntimeMode({ urlIntent, providerHealth });

    const forceRefresh = searchParams.get('refresh') === '1' || searchParams.get('force') === '1';
    const strictLive = searchParams.get('strict_live') === '1';
    const debugEnabled = searchParams.get('debug') === '1';

    const rawDateInput = searchParams.get('date') ?? undefined;
    const coercedDate = coerceIsoDate(rawDateInput, spine.tz);
    const dateDefaulted = Boolean(rawDateInput) && rawDateInput !== coercedDate;

    const responseSpine = { ...spine, mode: resolvedMode.mode, date: coercedDate };
    const requestIntent = {
      mode: resolvedMode.mode,
      sport: responseSpine.sport,
      tz: responseSpine.tz,
      date: responseSpine.date,
    } as const;

    let payload: TodayPayload;
    try {
      payload = await resolveToday({
        forceRefresh,
        strictLive,
        sport: responseSpine.sport.toUpperCase() as 'NBA' | 'NFL' | 'NHL' | 'MLB' | 'UFC',
        tz: responseSpine.tz,
        date: responseSpine.date,
        mode: resolvedMode.mode
      });
    } catch (error) {
      if (resolvedMode.mode === 'demo') {
        payload = await resolveToday({ sport: responseSpine.sport.toUpperCase() as 'NBA', tz: responseSpine.tz, date: responseSpine.date, mode: 'demo' });
      } else if (strictLive) {
        const generatedAt = new Date().toISOString();
        payload = {
          mode: 'live',
          generatedAt,
          leagues: [],
          games: [],
          board: [],
          reason: 'provider_unavailable',
          intent: requestIntent,
          effective: { mode: 'live', reason: 'provider_unavailable' },
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

    const warnings = dateDefaulted ? [...contextWarnings, 'date_defaulted'] : contextWarnings;
    const modeAlignedPayload = alignTodayPayload(payload, warnings, requestIntent, resolvedMode.reason);

    const board = {
      games: modeAlignedPayload.games,
      props: Array.isArray(modeAlignedPayload.board) ? modeAlignedPayload.board : []
    };

    const warningStep = parseWarningStep(modeAlignedPayload.providerWarnings ?? []);
    const sanitizedDebug = payload.debug
      ? {
        ...payload.debug,
        step: warningStep && payload.debug.step === 'resolve_context' ? warningStep : payload.debug.step,
        ...(dateDefaulted ? { originalDateInput: rawDateInput } : {})
      }
      : (dateDefaulted ? { step: 'resolve_context', hint: 'date_defaulted', originalDateInput: rawDateInput } : undefined);

    const responseBody = {
      ok: true,
      data: modeAlignedPayload,
      trace_id: responseSpine.trace_id,
      landing: modeAlignedPayload.landing,
      spine: responseSpine,
      provenance: modeAlignedPayload.provenance ?? { mode: modeAlignedPayload.mode, reason: modeAlignedPayload.reason, generatedAt: modeAlignedPayload.generatedAt },
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
      data: {
        ...demoPayload,
        intent: {
          mode: fallbackSpine.mode,
          sport: fallbackSpine.sport,
          tz: fallbackSpine.tz,
          date: fallbackSpine.date,
        },
        effective: { mode: demoPayload.mode, reason: demoPayload.reason }
      },
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
