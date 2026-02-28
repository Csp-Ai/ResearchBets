import type { MarketType } from '@/src/core/markets/marketType';

type VolatilityClass = 'low' | 'medium' | 'high';

export type ProLeg = {
  id: string;
  player: string;
  marketType: MarketType;
  line: string;
  odds?: string;
  volatility?: 'low' | 'medium' | 'high';
  confidence?: number;
  game?: string;
};

export type ProConstraintResult = {
  warnings: string[];
  varianceLegs: number;
  weakestDominancePct: number;
  excessiveCorrelation: boolean;
};

const HIGH_VARIANCE_TYPES = new Set<MarketType>(['assists', 'threes']);

export function inferStatType(marketType: MarketType): 'scoring' | 'playmaking' | 'combo' | 'game' {
  if (marketType === 'points' || marketType === 'threes') return 'scoring';
  if (marketType === 'assists') return 'playmaking';
  if (marketType === 'pra' || marketType === 'ra' || marketType === 'rebounds') return 'combo';
  return 'game';
}

export function varianceClass(statType: ReturnType<typeof inferStatType>): VolatilityClass {
  if (statType === 'playmaking') return 'high';
  if (statType === 'combo') return 'medium';
  return 'low';
}

function parseLine(line: string): number | null {
  const parsed = Number(line);
  return Number.isFinite(parsed) ? parsed : null;
}

function ladderDistanceFlag(leg: ProLeg): boolean {
  const line = parseLine(leg.line);
  if (line === null) return false;
  if (leg.marketType === 'points') return line >= 30;
  if (leg.marketType === 'threes') return line >= 4.5;
  if (leg.marketType === 'assists') return line >= 9.5;
  return false;
}

export function proBuildScore(leg: ProLeg): number {
  const confidence = Math.max(0, Math.min(1, leg.confidence ?? 0.5));
  const statType = inferStatType(leg.marketType);
  const variancePenalty = varianceClass(statType) === 'high' ? 0.2 : varianceClass(statType) === 'medium' ? 0.1 : 0;
  const ladderPenalty = ladderDistanceFlag(leg) ? 0.15 : 0;
  const volatilityPenalty = leg.volatility === 'high' ? 0.15 : leg.volatility === 'medium' ? 0.08 : 0;
  return Math.max(0, Math.round((confidence - variancePenalty - ladderPenalty - volatilityPenalty) * 100));
}

export function enforceProConstraints(legs: ProLeg[]): ProConstraintResult {
  const warnings: string[] = [];
  const varianceLegs = legs.filter((leg) => HIGH_VARIANCE_TYPES.has(leg.marketType) || leg.volatility === 'high').length;
  if (legs.length > 3) warnings.push('Reduce total leg count to 3 or fewer.');
  if (varianceLegs > 1) warnings.push('Cap high-variance legs to 1.');
  if (legs.some(ladderDistanceFlag)) warnings.push('Avoid thin ladders with long-distance lines.');

  const confidenceValues = legs.map((leg) => Math.max(0, Math.min(1, leg.confidence ?? 0.5)));
  const weakest = confidenceValues.length > 0 ? Math.min(...confidenceValues) : 0;
  const average = confidenceValues.length > 0 ? confidenceValues.reduce((a, b) => a + b, 0) / confidenceValues.length : 1;
  const weakestDominancePct = average > 0 ? Math.round(((average - weakest) / average) * 100) : 0;
  if (weakestDominancePct >= 25) warnings.push('Weakest leg dominates downside risk.');

  const gameCounts = new Map<string, number>();
  for (const leg of legs) {
    const key = leg.game ?? 'unknown';
    gameCounts.set(key, (gameCounts.get(key) ?? 0) + 1);
  }
  const excessiveCorrelation = Array.from(gameCounts.values()).some((count) => count >= 3);
  if (excessiveCorrelation) warnings.push('Correlation risk is elevated within one game script.');

  return { warnings, varianceLegs, weakestDominancePct, excessiveCorrelation };
}
