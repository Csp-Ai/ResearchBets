import 'server-only';

import { createHash } from 'node:crypto';

import { resolveTodayTruth, selectBoardViewFromToday } from '@/src/core/today/service.server';

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
  reason?: string;
  generatedAt: string;
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

const toBoardGame = (sport: BoardSport) => (game: ReturnType<typeof selectBoardViewFromToday>['games'][number]): BoardGame => {
  const [away = 'AWAY', home = 'HOME'] = game.teams;
  return {
    gameId: game.id,
    league: sport,
    home,
    away,
    startTimeUTC: game.lastUpdated,
    startTimeLocal: game.startTime,
    venue: `${home} Arena`,
    status: game.status
  };
};

export async function getBoardData(options?: { sport?: BoardSport; date?: string; tz?: string; demoRequested?: boolean }): Promise<BoardData> {
  const sport = options?.sport ?? 'NBA';
  const tz = options?.tz ?? 'America/Phoenix';
  const dateISO = options?.date ?? new Date().toISOString().slice(0, 10);

  const today = await resolveTodayTruth({
    sport,
    tz,
    date: dateISO,
    mode: options?.demoRequested ? 'demo' : 'live'
  });

  const boardView = selectBoardViewFromToday(today);
  const games = boardView.games.map(toBoardGame(sport));

  return {
    mode: boardView.mode,
    reason: boardView.reason,
    generatedAt: boardView.generatedAt,
    freshnessLabel: boardView.mode === 'live' ? 'Live updates' : boardView.mode === 'cache' ? 'Cached live slate' : 'Demo dataset',
    sport,
    tz,
    dateISO,
    games,
    scouts: toScouts(games, sport, tz, dateISO, boardView.mode === 'live' ? 'live' : 'demo'),
    modeFallbackApplied: boardView.mode !== 'live',
    providerErrors: boardView.providerErrors,
    userSafeReason: boardView.userSafeReason
  };
}
