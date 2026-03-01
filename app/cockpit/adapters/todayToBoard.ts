import { createDemoTodayPayload } from '@/src/core/today/demoToday';
import type { TodayPayload } from '@/src/core/today/types';

export type Risk = 'danger' | 'watch' | 'stable';

export type CockpitBoardLeg = {
  id: string;
  player: string;
  market: string;
  line: string;
  odds: string;
  hitRateL10: number | null;
  riskTag: Risk;
  gameId: string;
  matchup: string;
  startTime: string;
};

const toRisk = (tag?: string): Risk => {
  if (tag === 'watch') return 'watch';
  return 'stable';
};

export function todayToBoard(payload: TodayPayload, selectedSport?: string): CockpitBoardLeg[] {
  const sport = selectedSport?.toUpperCase();

  const boardRows = (payload.board ?? [])
    .filter((row) => {
      if (!sport) return true;
      const game = payload.games.find((entry) => entry.id === row.gameId);
      if (!game?.league) return true;
      return game.league.toUpperCase() === sport;
    })
    .map((row) => ({
      id: row.id,
      player: row.player,
      market: row.market,
      line: row.line ?? '—',
      odds: row.odds ?? '—',
      hitRateL10: typeof row.hitRateL10 === 'number' ? row.hitRateL10 : null,
      riskTag: toRisk(row.riskTag),
      gameId: row.gameId,
      matchup: row.matchup ?? row.gameId,
      startTime: row.startTime ?? 'TBD'
    }));

  if (boardRows.length > 0) return boardRows;

  return createDemoTodayPayload(sport).games.flatMap((game) => game.propsPreview.map((prop, index) => ({
    id: `${game.id}-${prop.id}-${index}`,
    player: prop.player,
    market: prop.market,
    line: prop.line ?? '—',
    odds: prop.odds ?? '-110',
    hitRateL10: typeof prop.hitRateL10 === 'number' ? prop.hitRateL10 : 55,
    riskTag: toRisk(prop.riskTag),
    gameId: game.id,
    matchup: game.matchup,
    startTime: game.startTime
  })));
}
