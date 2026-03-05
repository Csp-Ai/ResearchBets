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
  threesAttL1?: number;
  threesAttL3Avg?: number;
  threesAttL5Avg?: number;
  fgaL1?: number;
  fgaL3Avg?: number;
  fgaL5Avg?: number;
  attemptsSource?: string;
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
      startTime: row.startTime ?? 'TBD',
      threesAttL1: typeof row.threesAttL1 === 'number' ? row.threesAttL1 : undefined,
      threesAttL3Avg: typeof row.threesAttL3Avg === 'number' ? row.threesAttL3Avg : undefined,
      threesAttL5Avg: typeof row.threesAttL5Avg === 'number' ? row.threesAttL5Avg : undefined,
      fgaL1: typeof row.fgaL1 === 'number' ? row.fgaL1 : undefined,
      fgaL3Avg: typeof row.fgaL3Avg === 'number' ? row.fgaL3Avg : undefined,
      fgaL5Avg: typeof row.fgaL5Avg === 'number' ? row.fgaL5Avg : undefined,
      attemptsSource: row.attemptsSource
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
