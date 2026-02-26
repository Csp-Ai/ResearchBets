import 'server-only';

import { createHash } from 'node:crypto';

import { resolveRuntimeMode, type ModeReason } from '@/src/core/live/modeResolver.server';
import { getProviderRegistry } from '@/src/core/providers/registry.server';
import { createDemoTodayPayload } from '@/src/core/today/demoToday';

export type BoardSport = 'NBA' | 'NFL' | 'NHL' | 'MLB' | 'UFC';
export type BoardDataMode = 'live' | 'cache' | 'demo';

export type BoardGame = {
  gameId: string;
  league: BoardSport;
  home: string;
  away: string;
  startTimeUTC: string;
  startTimeLocal: string;
  venue: string;
  status: 'live' | 'upcoming';
};

export type BoardScout = {
  gameId: string;
  headline: string;
  subline: string;
  hitRate: number;
  reasons: string[];
  uncertainty: string;
  sources: string[];
  deepLinkParams: Record<string, string>;
};

export type BoardData = {
  mode: BoardDataMode;
  reason?: ModeReason;
  freshnessLabel: string;
  sport: BoardSport;
  tz: string;
  dateISO: string;
  games: BoardGame[];
  scouts: BoardScout[];
  modeFallbackApplied?: boolean;
  providerErrors?: string[];
  userSafeReason?: string;
};

const SPORT_MAP: Record<BoardSport, string> = {
  NBA: 'basketball_nba',
  NFL: 'americanfootball_nfl',
  NHL: 'icehockey_nhl',
  MLB: 'baseball_mlb',
  UFC: 'mma_mixed_martial_arts'
};

const toLocal = (iso: string, tz: string) => new Intl.DateTimeFormat('en-US', {
  timeZone: tz,
  month: 'short',
  day: '2-digit',
  hour: 'numeric',
  minute: '2-digit'
}).format(new Date(iso));

const seeded = (seed: string) => Number.parseInt(createHash('sha1').update(seed).digest('hex').slice(0, 8), 16);

const toScouts = (games: BoardGame[], sport: BoardSport, tz: string, dateISO: string, mode: 'live' | 'demo'): BoardScout[] => games.slice(0, 4).map((game, idx) => {
  const base = seeded(`${game.gameId}:${idx}`);
  const player = idx % 2 === 0 ? game.home : game.away;
  const line = 17.5 + (base % 9);
  return {
    gameId: game.gameId,
    headline: `${player} points over ${line.toFixed(1)}`,
    subline: `${idx % 2 === 0 ? '-112' : '+100'} consensus`,
    hitRate: Number((0.58 + ((base % 16) / 100)).toFixed(2)),
    reasons: ['Last-5 role stable', 'Opponent coverage profile supports shot volume', 'Line still near median outcome'],
    uncertainty: 'Minutes and late-game rotation shifts can reduce volume.',
    sources: ['odds provider aggregate', 'stats provider recent logs'],
    deepLinkParams: {
      mode,
      sport,
      tz,
      date: dateISO,
      gameId: game.gameId,
      propId: `${game.gameId}:prop:${idx}`
    }
  };
});

const mapDemo = (sport: BoardSport, tz: string, dateISO: string): BoardData => {
  const demo = createDemoTodayPayload();
  const games = demo.games.filter((game) => game.league === sport).map((game) => {
    const startTimeUTC = new Date().toISOString();
    return {
      gameId: game.id,
      league: sport,
      home: game.teams[1] ?? 'HOME',
      away: game.teams[0] ?? 'AWAY',
      startTimeUTC,
      startTimeLocal: game.startTime,
      venue: `${game.teams[1] ?? 'Home'} Arena`,
      status: game.status
    };
  });

  return {
    mode: 'demo',
    reason: 'provider_unavailable',
    freshnessLabel: 'Demo dataset',
    sport,
    tz,
    dateISO,
    games,
    scouts: toScouts(games, sport, tz, dateISO, 'demo'),
    modeFallbackApplied: true,
    providerErrors: ['provider_unavailable'],
    userSafeReason: 'Live provider data is temporarily unavailable, so deterministic demo data is shown.'
  };
};

export async function getBoardData(options?: { sport?: BoardSport; date?: string; tz?: string; demoRequested?: boolean }): Promise<BoardData> {
  const sport = options?.sport ?? 'NBA';
  const tz = options?.tz ?? 'America/Phoenix';
  const dateISO = options?.date ?? new Date().toISOString().slice(0, 10);
  const resolved = resolveRuntimeMode({ demoRequested: options?.demoRequested });

  if (resolved.mode !== 'live') {
    return {
      ...mapDemo(sport, tz, dateISO),
      reason: resolved.reason,
      freshnessLabel: resolved.dataFreshnessLabel
    };
  }

  try {
    const registry = getProviderRegistry();
    const live = await registry.oddsProvider.fetchEvents({ sport: SPORT_MAP[sport] });
    if (live.events.length === 0) {
      return mapDemo(sport, tz, dateISO);
    }

    const games: BoardGame[] = live.events.slice(0, 8).map((event, idx) => {
      const eventRecord = event as { id: string; commence_time?: string; home_team?: string; away_team?: string };
      const startTimeUTC = eventRecord.commence_time ?? new Date(Date.now() + idx * 3_600_000).toISOString();
      return {
        gameId: eventRecord.id,
        league: sport,
        home: eventRecord.home_team ?? `HOME-${idx + 1}`,
        away: eventRecord.away_team ?? `AWAY-${idx + 1}`,
        startTimeUTC,
        startTimeLocal: toLocal(startTimeUTC, tz),
        venue: `${eventRecord.home_team ?? 'Home'} Arena`,
        status: idx === 0 ? 'live' : 'upcoming'
      };
    });

    return {
      mode: 'live',
      reason: resolved.reason,
      freshnessLabel: resolved.dataFreshnessLabel,
      sport,
      tz,
      dateISO,
      games,
      scouts: toScouts(games, sport, tz, dateISO, 'live')
    };
  } catch (error) {
    return {
      ...mapDemo(sport, tz, dateISO),
      providerErrors: [error instanceof Error ? error.message : 'provider_unavailable']
    };
  }
}
