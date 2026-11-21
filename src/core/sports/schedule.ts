import type { TodayGame, TodayLeague } from '@/src/core/today/types';

const MAX_STARTED_AGE_MS = 9 * 60 * 60 * 1000;

export function eventDay(timestamp: string, timeZone: string): string | null {
  const instant = new Date(timestamp);
  if (!Number.isFinite(instant.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(instant);
  const fields = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${fields.year}-${fields.month}-${fields.day}`;
}

export function localDay(timeZone: string): string {
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

