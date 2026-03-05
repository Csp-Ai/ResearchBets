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


type FeaturedBucketResult = {
  l5Avg?: number;
  l10Avg?: number;
  provenance: MetricSource;
  reason?: string;
};

export const computeFeaturedBucketAveragesFromLogs = (logs: GameLog[], market: MarketType): FeaturedBucketResult => {
  if (!logs.length) return { provenance: 'heuristic', reason: 'No game logs available' };
  const values = logs.map((log) => statValueForMarket(log, market)).filter((v): v is number => typeof v === 'number');
  if (!values.length) return { provenance: 'heuristic', reason: 'No bucket values in logs' };
  return {
    l5Avg: avg(values.slice(0, 5)),
    l10Avg: avg(values.slice(0, 10)),
    provenance: 'live'
  };
};

export const deriveRoleConfidence = (minutesL3Avg?: number) => {
  if (typeof minutesL3Avg !== 'number') {
    return { roleConfidence: 'med' as const, roleReasons: ['Role volatility'] };
  }
  if (minutesL3Avg >= 32) return { roleConfidence: 'high' as const, roleReasons: ['Stable rotation minutes L3'] };
  if (minutesL3Avg >= 24) return { roleConfidence: 'med' as const, roleReasons: ['Role volatility'] };
  return { roleConfidence: 'low' as const, roleReasons: ['Low minutes (L3)', 'Role volatility'] };
};

export const deriveDeadLegRisk = (input: { market: MarketType; roleConfidence?: 'high'|'med'|'low'; odds?: string; l5Avg?: number; threesAttL5Avg?: number; minutesL3Avg?: number }) => {
  const reasons: string[] = [];
  if (typeof input.minutesL3Avg === 'number' && input.minutesL3Avg < 24) reasons.push('Low minutes (L3)');
  if (input.roleConfidence === 'low' || input.roleConfidence === 'med') reasons.push('Role volatility');
  const category = mapMarketToFeaturedStatCategory(input.market);
  if (category === 'threes' && typeof input.threesAttL5Avg === 'number' && input.threesAttL5Avg < 4.5) {
    reasons.push('Low 3PA volume (L5)');
  }
  const oddsNum = Number(input.odds);
  if (Number.isFinite(oddsNum) && oddsNum >= 160) reasons.push('Mismatch risk');

  const uniqueReasons = [...new Set(reasons)];
  if (uniqueReasons.length >= 3 || uniqueReasons.includes('Low minutes (L3)')) {
    return { deadLegRisk: 'high' as const, deadLegReasons: uniqueReasons };
  }
  if (uniqueReasons.length >= 1) return { deadLegRisk: 'med' as const, deadLegReasons: uniqueReasons };
  return { deadLegRisk: 'low' as const, deadLegReasons: ['Role volatility'] };
};


export const computeAttemptMetrics = (logs: GameLog[]) => {
  const threesAtt = logs.map((log) => log.stats.threePointAttempts).filter((v): v is number => typeof v === 'number');
  const fga = logs.map((log) => log.stats.fieldGoalAttempts).filter((v): v is number => typeof v === 'number');
  return {
    threesAttL1: threesAtt[0],
    threesAttL3Avg: avg(threesAtt.slice(0, 3)),
    threesAttL5Avg: avg(threesAtt.slice(0, 5)),
    fgaL1: fga[0],
    fgaL3Avg: avg(fga.slice(0, 3)),
    fgaL5Avg: avg(fga.slice(0, 5))
  };
};
