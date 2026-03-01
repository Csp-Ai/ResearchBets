import type { SlipBuilderLeg } from '@/features/betslip/SlipBuilder';

export type StressResult = {
  weakestLegLabel: string;
  correlationPressure: 'Low' | 'Medium' | 'High';
  fragility: number;
  reason: string;
  marketDeviation?: string;
};

export function runStressHeuristic(legs: SlipBuilderLeg[]): StressResult | null {
  if (legs.length < 2) return null;
  const sorted = [...legs].sort((a, b) => (a.confidence ?? 0.5) - (b.confidence ?? 0.5));
  const weakest = sorted[0];
  const fragility = Math.min(95, Math.max(18, Math.round((1 - (weakest?.confidence ?? 0.5)) * 100)));
  const sameGameCount = new Map<string, number>(legs.map((leg) => [leg.game ?? leg.id, 0]));
  legs.forEach((leg) => { const key = leg.game ?? leg.id; sameGameCount.set(key, (sameGameCount.get(key) ?? 0) + 1); });
  const maxCluster = Math.max(...sameGameCount.values());
  const correlationPressure: StressResult['correlationPressure'] = maxCluster >= 3 ? 'High' : maxCluster === 2 ? 'Medium' : 'Low';
  const marketDeviation = correlationPressure === 'High' ? '+3.1%' : correlationPressure === 'Medium' ? '+1.4%' : undefined;

  return {
    weakestLegLabel: weakest ? `${weakest.player} ${weakest.line} ${weakest.marketType.toUpperCase()}` : '—',
    correlationPressure,
    fragility,
    reason: maxCluster >= 2 ? 'Concentrated game script increases downside overlap.' : 'Leg profile remains diversified across games.',
    marketDeviation,
  };
}
