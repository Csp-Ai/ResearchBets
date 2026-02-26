import { asMarketType, type MarketType } from '@/src/core/markets/marketType';

import { fallbackToday } from './fallback';

export type NormalizedGame = {
  id: string;
  matchup: string;
  startTime: string;
};

export type NormalizedBoardProp = {
  id: string;
  player: string;
  market: MarketType;
  line: string;
  odds: string;
  hitRateL10: number;
  riskTag: 'stable' | 'watch';
  gameId: string;
};

export type NormalizedToday = {
  mode: 'live' | 'cache' | 'demo';
  reason?: string;
  games: NormalizedGame[];
  board: NormalizedBoardProp[];
};

const normalizeMode = (value: unknown): NormalizedToday['mode'] => {
  if (value === 'live' || value === 'cache') return value;
  return 'demo';
};

const normalizeGame = (entry: Record<string, unknown>, index: number): NormalizedGame => ({
  id: String(entry.id ?? `game-${index}`),
  matchup: String(entry.matchup ?? 'TBD @ TBD'),
  startTime: String(entry.startTime ?? entry.startISO ?? 'TBD')
});

const normalizeBoard = (entry: Record<string, unknown>, index: number): NormalizedBoardProp => {
  const hitRate = Number(entry.hitRateL10 ?? 55);
  return {
    id: String(entry.id ?? `prop-${index}`),
    player: String(entry.player ?? 'Player'),
    market: asMarketType(String(entry.market ?? 'points'), 'points'),
    line: String(entry.line ?? ''),
    odds: String(entry.odds ?? entry.consensusOdds ?? '-110'),
    hitRateL10: Number.isFinite(hitRate) ? hitRate : 55,
    riskTag: (Number.isFinite(hitRate) ? hitRate : 55) >= 60 ? 'stable' : 'watch',
    gameId: String(entry.gameId ?? '')
  };
};

export const normalizeTodayPayload = (payload: unknown): NormalizedToday => {
  const seedFallback = fallbackToday();
  if (!payload || typeof payload !== 'object') return seedFallback;

  const root = payload as Record<string, unknown>;
  const wrapped = root.data && typeof root.data === 'object' ? (root.data as Record<string, unknown>) : root;

  const mode = normalizeMode(root.mode ?? wrapped.mode);
  const reason = typeof root.reason === 'string' ? root.reason : (typeof wrapped.reason === 'string' ? wrapped.reason : undefined);

  const gamesInput = Array.isArray(wrapped.games) ? wrapped.games : [];
  const games = gamesInput.map((item, index) => normalizeGame((item ?? {}) as Record<string, unknown>, index));

  const explicitBoard = Array.isArray(wrapped.board)
    ? wrapped.board.map((item, index) => normalizeBoard((item ?? {}) as Record<string, unknown>, index))
    : [];

  const legacyBoard: NormalizedBoardProp[] = [];
  if (explicitBoard.length === 0) {
    gamesInput.forEach((rawGame, gameIndex) => {
      const game = (rawGame ?? {}) as Record<string, unknown>;
      const gameId = String(game.id ?? `game-${gameIndex}`);
      const preview = Array.isArray(game.propsPreview) ? game.propsPreview : [];
      preview.forEach((rawProp, propIndex) => {
        const prop = (rawProp ?? {}) as Record<string, unknown>;
        const rationaleCount = Array.isArray(prop.rationale) ? prop.rationale.length : 1;
        const hitRateL10 = Math.max(46, Math.min(78, 51 + rationaleCount * 6 - propIndex));
        legacyBoard.push({
          id: String(prop.id ?? `${gameId}-prop-${propIndex}`),
          player: String(prop.player ?? 'Player'),
          market: asMarketType(String(prop.market ?? 'points'), 'points'),
          line: String(prop.line ?? ''),
          odds: String(prop.odds ?? '-110'),
          hitRateL10,
          riskTag: hitRateL10 >= 60 ? 'stable' : 'watch',
          gameId
        });
      });
    });
  }

  const board = explicitBoard.length > 0 ? explicitBoard : legacyBoard;
  if (board.length > 0 && games.length > 0) {
    return { mode, reason, games, board };
  }

  const fallback = fallbackToday({ mode, date: String(root.date ?? '') || undefined, sport: String(root.sport ?? '') || undefined, tz: String(root.tz ?? '') || undefined });
  if (games.length > 0 && board.length === 0) {
    const filledBoard = fallback.board.map((prop, index) => ({ ...prop, gameId: games[index % games.length]?.id ?? prop.gameId }));
    return { mode, reason: reason ?? 'empty_board_from_api', games, board: filledBoard };
  }

  return { ...fallback, mode, reason: reason ?? fallback.reason };
};
