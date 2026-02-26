import { asMarketType } from '@/src/core/markets/marketType';
import {
  computeEdgeDelta,
  computeMarketImpliedProb,
  computeModelProb,
} from '@/src/core/markets/edgePrimitives';

import type { BoardRow } from './types';
import { fallbackToday } from './fallback';

export type NormalizedGame = {
  id: string;
  matchup: string;
  startTime: string;
};

export type NormalizedToday = {
  mode: 'live' | 'cache' | 'demo';
  reason?: string;
  games: NormalizedGame[];
  board: BoardRow[];
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

const buildBoardRow = (entry: Record<string, unknown>, index: number): BoardRow => {
  const id = String(entry.id ?? `prop-${index}`);
  const gameId = String(entry.gameId ?? '');
  const hitRateL10 = Number(entry.hitRateL10 ?? 55);
  const riskTag = (Number.isFinite(hitRateL10) ? hitRateL10 : 55) >= 60 ? 'stable' : 'watch';
  const odds = String(entry.odds ?? entry.consensusOdds ?? '-110');
  const marketImpliedProb = computeMarketImpliedProb({ odds });
  const modelProb = computeModelProb({
    modelProb: typeof entry.modelProb === 'number' ? entry.modelProb : null,
    deterministic: {
      idSeed: `${gameId}:${id}`,
      hitRateL10,
      hitRateL5: typeof entry.hitRateL5 === 'number' ? entry.hitRateL5 : undefined,
      riskTag,
    }
  });

  return {
    id,
    gameId,
    player: String(entry.player ?? 'Player'),
    market: asMarketType(String(entry.market ?? 'points'), 'points'),
    line: String(entry.line ?? ''),
    odds,
    hitRateL10: Number.isFinite(hitRateL10) ? hitRateL10 : 55,
    hitRateL5: typeof entry.hitRateL5 === 'number' ? entry.hitRateL5 : undefined,
    marketImpliedProb,
    modelProb,
    edgeDelta: computeEdgeDelta(modelProb, marketImpliedProb),
    riskTag,
    confidencePct: typeof entry.confidencePct === 'number' ? entry.confidencePct : undefined,
    book_source: typeof entry.book_source === 'string' ? entry.book_source : undefined,
    line_variance: typeof entry.line_variance === 'number' ? entry.line_variance : undefined,
    book_count: typeof entry.book_count === 'number' ? entry.book_count : undefined,
    source: typeof entry.source === 'string' ? entry.source : undefined,
    degraded: Boolean(entry.degraded),
    mode: entry.mode === 'live' || entry.mode === 'cache' ? entry.mode : 'demo'
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
    ? wrapped.board.map((item, index) => buildBoardRow((item ?? {}) as Record<string, unknown>, index))
    : [];

  const legacyBoard: BoardRow[] = [];
  if (explicitBoard.length === 0) {
    gamesInput.forEach((rawGame, gameIndex) => {
      const game = (rawGame ?? {}) as Record<string, unknown>;
      const gameId = String(game.id ?? `game-${gameIndex}`);
      const preview = Array.isArray(game.propsPreview) ? game.propsPreview : [];
      preview.forEach((rawProp, propIndex) => {
        const prop = (rawProp ?? {}) as Record<string, unknown>;
        const rationaleCount = Array.isArray(prop.rationale) ? prop.rationale.length : 1;
        const hitRateL10 = Math.max(46, Math.min(78, 51 + rationaleCount * 6 - propIndex));
        legacyBoard.push(buildBoardRow({
          id: String(prop.id ?? `${gameId}-prop-${propIndex}`),
          player: String(prop.player ?? 'Player'),
          market: String(prop.market ?? 'points'),
          line: String(prop.line ?? ''),
          odds: String(prop.odds ?? '-110'),
          hitRateL10,
          gameId,
          mode,
          source: String(prop.provenance ?? 'legacy_props_preview')
        }, propIndex));
      });
    });
  }

  const board = explicitBoard.length > 0 ? explicitBoard : legacyBoard;
  if (board.length > 0 && games.length > 0) {
    const gamesById = new Map(games.map((g) => [g.id, g]));
    return {
      mode,
      reason,
      games,
      board: board.map((row) => ({ ...row, matchup: gamesById.get(row.gameId)?.matchup, startTime: gamesById.get(row.gameId)?.startTime, mode }))
    };
  }

  const fallback = fallbackToday({ mode, date: String(root.date ?? '') || undefined, sport: String(root.sport ?? '') || undefined, tz: String(root.tz ?? '') || undefined });
  if (games.length > 0 && board.length === 0) {
    const filledBoard = fallback.board.map((prop, index) => {
      const gameId = games[index % games.length]?.id ?? prop.gameId;
      const game = games.find((entry) => entry.id === gameId);
      return { ...prop, gameId, matchup: game?.matchup, startTime: game?.startTime, mode };
    });
    return { mode, reason: reason ?? 'empty_board_from_api', games, board: filledBoard };
  }

  return { ...fallback, mode, reason: reason ?? fallback.reason };
};
