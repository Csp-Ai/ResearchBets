import { NextResponse } from 'next/server';

import { ALIAS_KEYS, CANONICAL_KEYS } from '@/src/core/env/keys';
import { resolveWithAliases } from '@/src/core/env/read.server';
import { getProviderRegistry } from '@/src/core/providers/registry.server';
import type { TodayGame, TodayPayload, TodayLeague } from '@/src/core/today/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Schedule-only read of ResearchBets' canonical odds provider. This deliberately
// does not depend on player-prop subscription coverage, model data, or the
// full /api/today viability threshold.
const SPORTS: Record<string, string> = {
  NBA: 'basketball_nba',
  NFL: 'americanfootball_nfl',
  NHL: 'icehockey_nhl',
  MLB: 'baseball_mlb',
  UFC: 'mma_mixed_martial_arts',
};
const MAX_STARTED_AGE_MS = 9 * 60 * 60 * 1000;
const MEMORY_TTL_MS = 45_000;
const memory = new Map<string, { expiresAt: number; data: TodayPayload }>();
const inflight = new Map<string, Promise<TodayPayload>>();

export function eventDay(timestamp: string, timeZone: string): string | null {
  const instant = new Date(timestamp);
  if (!Number.isFinite(instant.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(instant);
  const fields = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${fields.year}-${fields.month}-${fields.day}`;
}

function localDay(timeZone: string): string {
  return eventDay(new Date().toISOString(), timeZone)!;
}

type OddsEvent = {
  id?: string;
  commence_time?: string;
  home_team?: string;
  away_team?: string;
};

export function verifiedScheduleEvents(
  events: OddsEvent[], sport: TodayLeague, timeZone: string, date: string, now = Date.now(),
): TodayGame[] {
  return events.flatMap((event): TodayGame[] => {
    const startTimeISO = event.commence_time;
    const start = Date.parse(startTimeISO ?? '');
    if (!event.id || !startTimeISO || !Number.isFinite(start) ||
      !event.home_team?.trim() || !event.away_team?.trim() ||
      eventDay(startTimeISO, timeZone) !== date ||
      start < now - MAX_STARTED_AGE_MS) return [];

    return [{
      id: event.id,
      league: sport,
      // This is only a kickoff-time classification, NOT a verified score,
      // game-clock status, outcome, or confirmation that play continues.
      status: start > now ? 'upcoming' : 'live',
      startTime: new Intl.DateTimeFormat('en-US', {
        timeZone, hour: 'numeric', minute: '2-digit',
      }).format(new Date(start)),
      startTimeISO,
      matchup: `${event.away_team.trim()} @ ${event.home_team.trim()}`,
      teams: [event.away_team.trim(), event.home_team.trim()],
      bookContext: 'Provider event schedule; no verified scores',
      propsPreview: [],
      provenance: 'the-odds-api',
      lastUpdated: new Date(now).toISOString(),
    }];
  }).sort((a, b) =>
    Date.parse(a.startTimeISO || '') - Date.parse(b.startTimeISO || '')
  ).slice(0, 30);
}

async function loadSchedule(sport: keyof typeof SPORTS, timeZone: string, date: string): Promise<TodayPayload> {
  const key = `${sport}:${timeZone}:${date}`;
  const cached = memory.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  let request = inflight.get(key);
  if (!request) {
    request = (async () => {
      // Never call the mock provider in production-facing verified schedules.
      const apiKey = resolveWithAliases(
        CANONICAL_KEYS.ODDS_API_KEY,
        ALIAS_KEYS[CANONICAL_KEYS.ODDS_API_KEY],
      );
      if (!apiKey) throw new Error('provider_not_configured');
      const provider = getProviderRegistry().oddsProvider;
      const result = await provider.fetchEvents({ sport: SPORTS[sport] });
      if (result.fallbackReason || provider.id !== 'the-odds-api') {
        throw new Error('provider_degraded');
      }
      const now = Date.now();
      const generatedAt = new Date(now).toISOString();
      const games = verifiedScheduleEvents(
        (result.events ?? []) as OddsEvent[], sport as TodayLeague, timeZone, date, now,
      );
      const data: TodayPayload = {
        mode: 'live',
        generatedAt,
        intent: { mode: 'live', date, tz: timeZone, sport },
        effective: { mode: 'live', reason: 'schedule_only' },
        provenance: { mode: 'live', reason: 'schedule_only', generatedAt },
        leagues: [sport as TodayLeague],
        games,
        board: [],
        reason: 'schedule_only',
      };
      memory.set(key, { data, expiresAt: now + MEMORY_TTL_MS });
      if (memory.size > 80) {
        for (const [cacheKey, value] of memory) {
          if (value.expiresAt <= now) memory.delete(cacheKey);
        }
      }
      return data;
    })().finally(() => inflight.delete(key));
    inflight.set(key, request);
  }
  return request;
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const sport = (params.get('sport') ?? '').toUpperCase();
  if (!Object.prototype.hasOwnProperty.call(SPORTS, sport)) {
    return NextResponse.json({ ok: false, reason: 'unsupported_sport' }, { status: 400 });
  }
  const timeZone = params.get('tz') || 'America/Phoenix';
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
  } catch {
    return NextResponse.json({ ok: false, reason: 'invalid_timezone' }, { status: 400 });
  }
  const date = params.get('date') || localDay(timeZone);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date))) {
    return NextResponse.json({ ok: false, reason: 'invalid_date' }, { status: 400 });
  }
  try {
    const data = await loadSchedule(sport, timeZone, date);
    return NextResponse.json({ ok: true, data }, {
      headers: { 'Cache-Control': 'public, max-age=0, s-maxage=30' },
    });
  } catch (error) {
    const reason = error instanceof Error && error.message === 'provider_not_configured'
      ? 'schedule_provider_not_configured' : 'schedule_provider_unavailable';
    return NextResponse.json({ ok: false, reason, data: null }, {
      status: 503,
      headers: { 'Cache-Control': 'no-store' },
    });
  }
}
