import { describe, expect, it } from 'vitest';

import { localCalendarDate, verifiedGames } from '../TodayGamesExplorer';
import type { TodayPayload } from '@/src/core/today/types';

const now = new Date();
const formatted = localCalendarDate('America/Phoenix', now);
const kickoff = new Date(`${formatted}T20:00:00Z`).toISOString();
const anotherDay = new Date(now.getTime() + 2 * 86_400_000).toISOString();
function payload(mode: TodayPayload['mode'] = 'live'): TodayPayload {
  return {
    mode,
    generatedAt: now.toISOString(),
    intent: { mode, date: formatted, tz: 'America/Phoenix', sport: 'NBA' },
    leagues: ['NBA'],
    games: [
      { id: 'verified', league: 'NBA', status: 'upcoming', startTime: 'Today 7:00 PM',
        startTimeISO: kickoff, matchup: 'Away @ Home', teams: ['Away','Home'],
        bookContext: '', propsPreview: [], provenance: 'provider', lastUpdated: now.toISOString() },
      { id: 'tomorrow', league: 'NBA', status: 'upcoming', startTime: 'Tomorrow',
        startTimeISO: anotherDay, matchup: 'Next @ Later', teams: ['Next','Later'],
        bookContext: '', propsPreview: [], provenance: 'provider', lastUpdated: now.toISOString() }
    ]
  };
}

describe('date-aware verified sports discovery', () => {
  it('uses the America/Phoenix calendar date at UTC midnight boundaries', () => {
    expect(localCalendarDate('America/Phoenix', new Date('2026-11-22T02:00:00Z'))).toBe('2026-11-21');
  });
  it('never treats demo or cached games as currently verified live observations', () => {
    expect(verifiedGames(payload('demo'), formatted)).toEqual([]);
    expect(verifiedGames(payload('cache'), formatted)).toEqual([]);
  });
  it('excludes games that belong to another calendar day', () => {
    expect(verifiedGames(payload(), formatted).map((game) => game.id)).toEqual(['verified']);
  });
  it('rejects stale generation and missing source kickoff timestamps', () => {
    const stale = payload();
    stale.generatedAt = new Date(now.getTime() - 60 * 60_000).toISOString();
    expect(verifiedGames(stale, formatted)).toEqual([]);
    const missing = payload();
    missing.games[0]!.startTimeISO = undefined;
    expect(verifiedGames(missing, formatted)).toEqual([]);
  });
});
