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
  hitRateL5?: number;
  marketImpliedProb: number;
  modelProb: number;
  edgeDelta: number;
  riskTag: 'stable' | 'watch';
  rationale?: string[];
  provenance?: string;
  lastUpdated?: string;
  minutesL1?: number;
  minutesL3Avg?: number;
  l5Avg?: number;
  l10Avg?: number;
  threesAttL5Avg?: number;
  l5Source?: 'live' | 'cached' | 'demo' | 'heuristic';
  minutesSource?: 'live' | 'cached' | 'demo' | 'heuristic';
  attemptsSource?: 'live' | 'cached' | 'demo' | 'heuristic';
  roleConfidence?: 'high' | 'med' | 'low';
  roleReasons?: string[];
  deadLegRisk?: 'low' | 'med' | 'high';
  deadLegReasons?: string[];
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
      hitRateL5: typeof row.hitRateL5 === 'number' ? row.hitRateL5 : undefined,
      marketImpliedProb: typeof row.marketImpliedProb === 'number' ? row.marketImpliedProb : 0.5,
      modelProb: typeof row.modelProb === 'number' ? row.modelProb : 0.5,
      edgeDelta: typeof row.edgeDelta === 'number' ? row.edgeDelta : 0,
      riskTag: row.riskTag === 'stable' ? 'stable' : 'watch',
      rationale: Array.isArray(row.rationale) ? row.rationale.map(String) : undefined,
      provenance: typeof row.provenance === 'string' ? row.provenance : undefined,
      lastUpdated: typeof row.lastUpdated === 'string' ? row.lastUpdated : undefined,
      minutesL1: typeof row.minutesL1 === 'number' ? row.minutesL1 : undefined,
      minutesL3Avg: typeof row.minutesL3Avg === 'number' ? row.minutesL3Avg : undefined,
      l5Avg: typeof row.l5Avg === 'number' ? row.l5Avg : undefined,
      l10Avg: typeof row.l10Avg === 'number' ? row.l10Avg : undefined,
      threesAttL5Avg: typeof row.threesAttL5Avg === 'number' ? row.threesAttL5Avg : undefined,
      l5Source: row.l5Source === 'live' || row.l5Source === 'cached' || row.l5Source === 'demo' || row.l5Source === 'heuristic' ? row.l5Source : undefined,
      minutesSource: row.minutesSource === 'live' || row.minutesSource === 'cached' || row.minutesSource === 'demo' || row.minutesSource === 'heuristic' ? row.minutesSource : undefined,
      attemptsSource: row.attemptsSource === 'live' || row.attemptsSource === 'cached' || row.attemptsSource === 'demo' || row.attemptsSource === 'heuristic' ? row.attemptsSource : undefined,
      roleConfidence: row.roleConfidence === 'high' || row.roleConfidence === 'med' || row.roleConfidence === 'low' ? row.roleConfidence : undefined,
      roleReasons: Array.isArray(row.roleReasons) ? row.roleReasons.map(String) : undefined,
      deadLegRisk: row.deadLegRisk === 'low' || row.deadLegRisk === 'med' || row.deadLegRisk === 'high' ? row.deadLegRisk : undefined,
      deadLegReasons: Array.isArray(row.deadLegReasons) ? row.deadLegReasons.map(String) : undefined
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


const roleScore = (role?: 'high'|'med'|'low') => role === 'high' ? 2 : role === 'med' ? 1 : 0;
const deadLegPenalty = (risk?: 'low'|'med'|'high') => risk === 'low' ? 0 : risk === 'med' ? 1 : 2;

export function buildCoreCandidates(payload: { board?: unknown[] }, options?: { maxPerGame?: number; maxPerTeam?: number }): BoardProp[] {
  const rows = buildCanonicalBoard(payload);
  const maxPerGame = options?.maxPerGame ?? 10;
  const maxPerTeam = options?.maxPerTeam ?? 4;
  const byGame = new Map<string, BoardProp[]>();
  for (const row of rows) {
    const arr = byGame.get(row.gameId) ?? [];
    arr.push(row);
    byGame.set(row.gameId, arr);
  }

  const result: BoardProp[] = [];
  for (const group of byGame.values()) {
    const teamCounts = new Map<string, number>();
    const sorted = [...group].sort((a, b) => {
      const scoreA = (a.minutesL3Avg ?? 0) * 2 + roleScore(a.roleConfidence) * 10 - deadLegPenalty(a.deadLegRisk) * 8 + (a.l5Avg ?? 0);
      const scoreB = (b.minutesL3Avg ?? 0) * 2 + roleScore(b.roleConfidence) * 10 - deadLegPenalty(b.deadLegRisk) * 8 + (b.l5Avg ?? 0);
      return scoreB - scoreA;
    });

    for (const row of sorted) {
      if (result.filter((r) => r.gameId === row.gameId).length >= maxPerGame) break;
      const teams = row.matchup.split('@').map((v) => v.trim()).filter(Boolean);
      const team = teams.find((t) => row.player.toLowerCase().includes(t.toLowerCase())) ?? teams[0] ?? 'TEAM';
      const count = teamCounts.get(team) ?? 0;
      if (count >= maxPerTeam) continue;
      teamCounts.set(team, count + 1);
      result.push(row);
    }
  }
  return result;
}
