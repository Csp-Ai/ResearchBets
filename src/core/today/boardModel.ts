import { asMarketType, type MarketType } from '@/src/core/markets/marketType';

export type BoardProp = {
  id: string;
  gameId: string;
  matchup: string;
  startTime: string;
  player: string;
  market: MarketType;
  line: string;
  odds: string;
  hitRateL10: number;
  marketImpliedProb: number;
  modelProb: number;
  edgeDelta: number;
  riskTag: 'stable' | 'watch';
  rationale?: string[];
  provenance?: string;
  lastUpdated?: string;
};

type BoardInputRow = Record<string, unknown>;

const DEFAULT_MATCHUP = 'TBD @ TBD';
const DEFAULT_START = 'TBD';

export function buildCanonicalBoard(payload: { board?: unknown[] }): BoardProp[] {
  const rows = Array.isArray(payload.board) ? payload.board : [];
  return rows
    .filter((row): row is BoardInputRow => Boolean(row && typeof row === 'object'))
    .map((row) => ({
      id: String(row.id ?? ''),
      gameId: String(row.gameId ?? ''),
      matchup: typeof row.matchup === 'string' ? row.matchup : DEFAULT_MATCHUP,
      startTime: typeof row.startTime === 'string' ? row.startTime : DEFAULT_START,
      player: String(row.player ?? 'Unknown player'),
      market: asMarketType(String(row.market ?? 'points'), 'points'),
      line: typeof row.line === 'string' ? row.line : '',
      odds: typeof row.odds === 'string' ? row.odds : '-110',
      hitRateL10: typeof row.hitRateL10 === 'number' ? row.hitRateL10 : 55,
      marketImpliedProb: typeof row.marketImpliedProb === 'number' ? row.marketImpliedProb : 0.5,
      modelProb: typeof row.modelProb === 'number' ? row.modelProb : 0.5,
      edgeDelta: typeof row.edgeDelta === 'number' ? row.edgeDelta : 0,
      riskTag: row.riskTag === 'stable' ? 'stable' : 'watch',
      rationale: Array.isArray(row.rationale) ? row.rationale.map(String) : undefined,
      provenance: typeof row.provenance === 'string' ? row.provenance : undefined,
      lastUpdated: typeof row.lastUpdated === 'string' ? row.lastUpdated : undefined
    }));
}

export function buildTopSpotScouts(payload: { board?: unknown[]; generatedAt?: string }, limit = 5): BoardProp[] {
  return buildCanonicalBoard(payload).slice(0, limit).map((row) => ({
    ...row,
    rationale: row.rationale ?? ['Canonical board signal'],
    provenance: row.provenance ?? 'today.board',
    lastUpdated: row.lastUpdated ?? payload.generatedAt
  }));
}
