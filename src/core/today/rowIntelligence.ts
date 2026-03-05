import type { MarketType } from '@/src/core/markets/marketType';
import { mapMarketToFeaturedStatCategory } from '@/src/core/markets/statCategory';
import type { GameLog } from '@/src/core/providers/sportsdataio';

export type MetricSource = 'live' | 'cached' | 'demo' | 'heuristic';

const avg = (values: number[]) => values.length ? Number((values.reduce((a,b)=>a+b,0)/values.length).toFixed(2)) : undefined;

export const computeMinutesMetrics = (logs: GameLog[]) => {
  const mins = logs.map((log) => log.stats.minutes).filter((v): v is number => typeof v === 'number');
  return {
    minutesL1: mins[0],
    minutesL3Avg: avg(mins.slice(0, 3))
  };
};

const statValueForMarket = (log: GameLog, market: MarketType): number | undefined => {
  const category = mapMarketToFeaturedStatCategory(market);
  if (category === 'pra') {
    const pts = log.stats.points ?? 0;
    const reb = log.stats.rebounds ?? 0;
    const ast = log.stats.assists ?? 0;
    return pts + reb + ast;
  }
  if (category === 'points' || category === 'rebounds' || category === 'assists' || category === 'threes') {
    return log.stats[category];
  }
  return undefined;
};

export const computeL5AvgForMarket = (logs: GameLog[], market: MarketType): number | undefined => {
  const values = logs.map((log) => statValueForMarket(log, market)).filter((v): v is number => typeof v === 'number');
  return avg(values.slice(0, 5));
};

export const deriveRoleConfidence = (minutesL3Avg?: number) => {
  if (typeof minutesL3Avg !== 'number') {
    return { roleConfidence: 'med' as const, roleReasons: ['Minutes unavailable (heuristic)'] };
  }
  if (minutesL3Avg >= 32) return { roleConfidence: 'high' as const, roleReasons: ['Stable rotation minutes L3'] };
  if (minutesL3Avg >= 24) return { roleConfidence: 'med' as const, roleReasons: ['Rotation minutes in mid band'] };
  return { roleConfidence: 'low' as const, roleReasons: ['Low minutes L3', 'Rotation volatility'] };
};

export const deriveDeadLegRisk = (input: { market: MarketType; roleConfidence?: 'high'|'med'|'low'; odds?: string; l5Avg?: number }) => {
  const reasons: string[] = [];
  if (input.roleConfidence === 'low') reasons.push('Low role confidence from minutes');
  const category = mapMarketToFeaturedStatCategory(input.market);
  if (category === 'threes') {
    if (typeof input.l5Avg === 'number' && input.l5Avg < 1.6) {
      reasons.push('Low-attempt 3PM profile');
    } else {
      reasons.push('Low-attempt risk (heuristic)');
    }
  }
  const oddsNum = Number(input.odds);
  if (Number.isFinite(oddsNum) && oddsNum >= 180) reasons.push('Aggressive odds booster leg');

  if (reasons.length >= 2 || reasons.some((r) => r.includes('Low role confidence'))) {
    return { deadLegRisk: 'high' as const, deadLegReasons: reasons };
  }
  if (reasons.length === 1) return { deadLegRisk: 'med' as const, deadLegReasons: reasons };
  return { deadLegRisk: 'low' as const, deadLegReasons: ['Role and line profile within normal range'] };
};
