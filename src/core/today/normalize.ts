import { asMarketType } from '@/src/core/markets/marketType';
import {
  computeEdgeDelta,
  computeMarketImpliedProb,
  computeModelProb,
} from '@/src/core/markets/edgePrimitives';

import type { BoardRow } from './types';

export type NormalizedGame = {
  id: string;
  matchup: string;
  startTime: string;
};

export type NormalizedToday = {
  mode: 'live' | 'cache' | 'demo';
  reason?: string;
  generatedAt?: string;
  provenance?: { mode: 'live' | 'cache' | 'demo'; reason?: string; generatedAt: string };
  games: NormalizedGame[];
  board: BoardRow[];
  status?: 'active' | 'next' | 'market_closed';
  nextAvailableStartTime?: string;
  providerHealth?: Array<Record<string, unknown>>;
};

const normalizeMode = (value: unknown): NormalizedToday['mode'] => {
  if (value === 'live' || value === 'cache') return value;
  return 'live';
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
    deterministic: { idSeed: `${gameId}:${id}`, hitRateL10, riskTag }
  });

  return {
    id,
    gameId,
    player: String(entry.player ?? 'Unknown player'),
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
    mode: entry.mode === 'cache' ? 'cache' : 'live'
  };
};

export const normalizeTodayPayload = (payload: unknown): NormalizedToday => {
  if (!payload || typeof payload !== 'object') {
    return { mode: 'live', reason: 'provider_unavailable', games: [], board: [], status: 'market_closed' };
  }

  const root = payload as Record<string, unknown>;
  const mode = normalizeMode(root.mode);
  const reason = typeof root.reason === 'string' ? root.reason : undefined;
  const generatedAt = typeof root.generatedAt === 'string' ? root.generatedAt : undefined;
  const provenance = root.provenance && typeof root.provenance === 'object'
    ? {
      mode: normalizeMode((root.provenance as Record<string, unknown>).mode),
      reason: typeof (root.provenance as Record<string, unknown>).reason === 'string' ? String((root.provenance as Record<string, unknown>).reason) : undefined,
      generatedAt: String((root.provenance as Record<string, unknown>).generatedAt ?? generatedAt ?? new Date().toISOString())
    }
    : undefined;

  const games = Array.isArray(root.games)
    ? root.games.filter((entry): entry is Record<string, unknown> => Boolean(entry && typeof entry === 'object')).map(normalizeGame)
    : [];

  const board = Array.isArray(root.board)
    ? root.board.filter((entry): entry is Record<string, unknown> => Boolean(entry && typeof entry === 'object')).map(buildBoardRow)
    : [];

  const gamesById = new Map(games.map((g) => [g.id, g]));
  return {
    mode,
    reason,
    generatedAt,
    provenance,
    games,
    board: board.map((row) => ({ ...row, matchup: gamesById.get(row.gameId)?.matchup, startTime: gamesById.get(row.gameId)?.startTime, mode })),
    status: root.status === 'active' || root.status === 'next' || root.status === 'market_closed' ? root.status : undefined,
    nextAvailableStartTime: typeof root.nextAvailableStartTime === 'string' ? root.nextAvailableStartTime : undefined,
    providerHealth: Array.isArray(root.providerHealth) ? root.providerHealth.filter((v) => v && typeof v === 'object') as Array<Record<string, unknown>> : undefined
  };
};
