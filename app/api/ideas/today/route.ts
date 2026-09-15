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
  const scanned = await scanTodayIdeas({
    date: input.date,
    timeZone: input.timeZone,
    sport: 'NFL',
    limit: 12,
  });
  const result = normalizeMarketAvailability(scanned);

  if (result.mode !== 'live-market' || result.ideas.length === 0) {
    return result;
  }

  const recent = await fetchNflRecentFormForIdeas(
    result.ideas.slice(0, RECENT_FORM_LIMIT).map((idea) => ({
      id: idea.id,
      player: idea.player,
      marketType: idea.marketType,
      line: idea.line,
    })),
  );

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
  };
}

async function getCachedIdeas(input: { date: string; timeZone: string }): Promise<unknown> {
  const key = `NFL:${input.date}:${input.timeZone}`;
  const cached = ideasCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  const existing = inFlightIdeas.get(key);
  if (existing) return existing;

  const request = resolveIdeasData(input)
    .then((data) => {
      ideasCache.set(key, { expiresAt: Date.now() + IDEAS_CACHE_TTL_MS, data });
      return data;
    })
    .finally(() => {
      inFlightIdeas.delete(key);
    });

  inFlightIdeas.set(key, request);
  return request;
}

export async function GET(request: Request) {
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
    const data = await getCachedIdeas({ date, timeZone });
    return NextResponse.json(
      { ok: true, data },
      { headers: { 'Cache-Control': RESPONSE_CACHE_CONTROL } },
    );
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: 'today_ideas_unavailable',
        message: 'Live market ideas are temporarily unavailable.',
      },
      {
        status: 503,
        headers: { 'Cache-Control': 'public, max-age=0, s-maxage=5, stale-if-error=30' },
      },
    );
  }
}
