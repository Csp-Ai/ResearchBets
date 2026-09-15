import { unstable_cache } from 'next/cache';
import { NextResponse } from 'next/server';

import { fetchNflRecentFormForIdeas } from '@/src/core/ideas/nflRecentForm.server';
import { scanTodayIdeas } from '@/src/core/ideas/todayIdeas.server';
import { coerceIsoDate } from '@/src/core/nervous/spine';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const RECENT_FORM_LIMIT = 5;
const IDEAS_CACHE_TTL_MS = 45_000;
const RESPONSE_CACHE_CONTROL = 'public, max-age=0, s-maxage=45, stale-while-revalidate=120';

const ideasCache = new Map<string, { expiresAt: number; data: unknown }>();
const inFlightIdeas = new Map<string, Promise<unknown>>();

type CacheState = 'memory-hit' | 'shared-inflight' | 'persistent-or-origin';
type GenerationTiming = {
  scanMs: number;
  recentFormMs: number;
  totalMs: number;
};

type IdeasPayloadWithDiagnostics = {
  diagnostics?: {
    generationTimingMs?: GenerationTiming;
  };
};

const elapsed = (startedAt: number) => Math.max(0, Date.now() - startedAt);

const normalizeMarketAvailability = <T extends {
  mode: 'live-market' | 'unavailable';
  events: unknown[];
  ideas: unknown[];
  warnings: string[];
}>(result: T): T => {
  if (result.mode !== 'live-market' || result.ideas.length > 0 || result.events.length === 0) {
    return result;
  }

  const unavailableEventCount = result.warnings.filter((warning) =>
    warning.startsWith('event_odds_unavailable:'),
  ).length;

  if (unavailableEventCount < result.events.length) return result;

  return {
    ...result,
    mode: 'unavailable',
    warnings: [...new Set([...result.warnings, 'market_data_unavailable'])],
  };
};

async function resolveIdeasData(input: { date: string; timeZone: string }): Promise<unknown> {
  const totalStartedAt = Date.now();
  const scanStartedAt = Date.now();
  const scanned = await scanTodayIdeas({
    date: input.date,
    timeZone: input.timeZone,
    sport: 'NFL',
    limit: 12,
  });
  const scanMs = elapsed(scanStartedAt);
  const result = normalizeMarketAvailability(scanned);

  if (result.mode !== 'live-market' || result.ideas.length === 0) {
    return {
      ...result,
      diagnostics: {
        generationTimingMs: {
          scanMs,
          recentFormMs: 0,
          totalMs: elapsed(totalStartedAt),
        },
      },
    };
  }

  const recentFormStartedAt = Date.now();
  const recent = await fetchNflRecentFormForIdeas(
    result.ideas.slice(0, RECENT_FORM_LIMIT).map((idea) => ({
      id: idea.id,
      player: idea.player,
      marketType: idea.marketType,
      line: idea.line,
    })),
  );
  const recentFormMs = elapsed(recentFormStartedAt);

  const ideas = result.ideas.map((idea) => {
    const recentForm = recent.byIdeaId[idea.id];
    if (!recentForm) return idea;
    return {
      ...idea,
      recentForm,
      why: [
        ...idea.why,
        `Recent form at this threshold: ${recentForm.l5Hits}/${recentForm.l5Games} L5 · ${recentForm.l10Hits}/${recentForm.l10Games} L10 · ${recentForm.recentAverage} recent average`,
      ],
    };
  });

  return {
    ...result,
    ideas,
    warnings: recent.warning ? [...result.warnings, recent.warning] : result.warnings,
    diagnostics: {
      generationTimingMs: {
        scanMs,
        recentFormMs,
        totalMs: elapsed(totalStartedAt),
      },
    },
  };
}

const resolveIdeasDataPersistent = unstable_cache(
  async (date: string, timeZone: string) => resolveIdeasData({ date, timeZone }),
  ['researchbets-today-ideas-v3'],
  { revalidate: 45 },
);

async function getCachedIdeas(input: { date: string; timeZone: string }): Promise<{ data: unknown; cacheState: CacheState }> {
  const key = `NFL:${input.date}:${input.timeZone}`;
  const cached = ideasCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return { data: cached.data, cacheState: 'memory-hit' };
  }

  const existing = inFlightIdeas.get(key);
  if (existing) {
    return { data: await existing, cacheState: 'shared-inflight' };
  }

  const request = resolveIdeasDataPersistent(input.date, input.timeZone)
    .then((data) => {
      ideasCache.set(key, { expiresAt: Date.now() + IDEAS_CACHE_TTL_MS, data });
      return data;
    })
    .finally(() => {
      inFlightIdeas.delete(key);
    });

  inFlightIdeas.set(key, request);
  return { data: await request, cacheState: 'persistent-or-origin' };
}

const readGenerationTiming = (data: unknown): GenerationTiming | undefined => {
  if (!data || typeof data !== 'object') return undefined;
  return (data as IdeasPayloadWithDiagnostics).diagnostics?.generationTimingMs;
};

const generationTimingHeader = (timing?: GenerationTiming): string | undefined => {
  if (!timing) return undefined;
  return `scan;dur=${timing.scanMs}, recent-form;dur=${timing.recentFormMs}, generation;dur=${timing.totalMs}`;
};

export async function GET(request: Request) {
  const requestStartedAt = Date.now();
  const { searchParams } = new URL(request.url);
  const timeZone = searchParams.get('tz') || 'America/Phoenix';
  const rawDate = searchParams.get('date') || undefined;
  const date = coerceIsoDate(rawDate, timeZone);
  const requestedSport = (searchParams.get('sport') || 'NFL').toUpperCase();

  if (requestedSport !== 'NFL') {
    return NextResponse.json(
      {
        ok: false,
        error: 'sport_not_supported_yet',
        message: 'Today Ideas v1 currently supports NFL.',
      },
      { status: 400 },
    );
  }

  try {
    const { data, cacheState } = await getCachedIdeas({ date, timeZone });
    const totalMs = elapsed(requestStartedAt);
    const generationTiming = readGenerationTiming(data);
    const timingParts = [`request;dur=${totalMs}`];
    const generation = generationTimingHeader(generationTiming);
    if (generation) timingParts.push(generation);

    return NextResponse.json(
      { ok: true, data },
      {
        headers: {
          'Cache-Control': RESPONSE_CACHE_CONTROL,
          'Server-Timing': timingParts.join(', '),
          'X-ResearchBets-Cache': cacheState,
          'X-ResearchBets-Timing-Scope': 'request timings are current; generation timings describe the cached payload generation',
        },
      },
    );
  } catch {
    const totalMs = elapsed(requestStartedAt);
    return NextResponse.json(
      {
        ok: false,
        error: 'today_ideas_unavailable',
        message: 'Live market ideas are temporarily unavailable.',
      },
      {
        status: 503,
        headers: {
          'Cache-Control': 'public, max-age=0, s-maxage=5, stale-if-error=30',
          'Server-Timing': `request;dur=${totalMs}`,
          'X-ResearchBets-Cache': 'error',
          'X-ResearchBets-Timing-Scope': 'request-only',
        },
      },
    );
  }
}
