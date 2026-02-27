import type { SlipTrackingState, TrackedLegState } from './trackingTypes';

function findWeakestLeg(state: SlipTrackingState, eliminatedByLegId?: string) {
  if (eliminatedByLegId) return eliminatedByLegId;
  const byConviction = [...state.legs]
    .filter((leg) => typeof leg.convictionAtBuild === 'number')
    .sort((a, b) => (a.convictionAtBuild ?? 0) - (b.convictionAtBuild ?? 0))[0];
  if (byConviction) return byConviction.legId;
  const volatilityScore: Record<TrackedLegState['volatility'], number> = { low: 1, medium: 2, high: 3 };
  return [...state.legs].sort((a, b) => volatilityScore[b.volatility] - volatilityScore[a.volatility])[0]?.legId;
}

export function computeSlipStatus(state: SlipTrackingState): SlipTrackingState {
  const firstMiss = state.legs.find((leg) => leg.outcome === 'miss');
  const settled = state.legs.every((leg) => leg.outcome !== 'pending');

  const status = settled ? 'settled' : firstMiss ? 'eliminated' : 'alive';
  const eliminatedByLegId = firstMiss?.legId;
  const pendingAfterElimination = state.legs.filter((leg) => leg.outcome === 'pending').length;
  const wouldHit = state.legs.filter((leg) => leg.outcome === 'hit').length;
  const remainingResolved = state.legs.filter((leg) => leg.outcome !== 'pending' && leg.outcome !== 'miss').length;

  const highestVolatilityLegs = state.legs
    .filter((leg) => leg.volatility === 'high')
    .map((leg) => leg.player)
    .slice(0, 3);

  const learningHighlights: string[] = [];
  if (firstMiss) {
    learningHighlights.push(`Parlay eliminated by ${firstMiss.player} ${firstMiss.market} ${firstMiss.line}. Tracking remaining legs for learning.`);
    learningHighlights.push(`Remaining legs that would have hit: ${wouldHit}/${Math.max(1, state.legs.length - 1)}.`);
    if (pendingAfterElimination > 0) {
      learningHighlights.push(`${pendingAfterElimination} remaining leg(s) still in-flight (learning only).`);
    }
  } else if (settled) {
    learningHighlights.push(`Slip settled. Closed legs with non-miss outcomes: ${remainingResolved}/${state.legs.length}.`);
  } else {
    learningHighlights.push('Slip alive. Monitoring fragility and weakest-leg risk in real time.');
  }

  if (highestVolatilityLegs.length > 0) {
    learningHighlights.push(`Highest volatility legs in slip: ${highestVolatilityLegs.join(', ')}.`);
  }

  const weakestLegId = findWeakestLeg(state, eliminatedByLegId);
  return {
    ...state,
    status,
    eliminatedByLegId,
    summary: {
      weakestLegId,
      survivalEstimate: Math.max(0, Math.round((state.legs.filter((leg) => leg.outcome !== 'miss').length / Math.max(1, state.legs.length)) * 100)),
      learningHighlights
    }
  };
}
