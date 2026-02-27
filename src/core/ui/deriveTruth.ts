import type { SlipTrackingState } from '@/src/core/slips/trackingTypes';

export type TruthMode = 'demo' | 'cache' | 'live';

export function deriveRunHeader(input: { trace_id?: string; mode?: TruthMode; reason?: string; generatedAt?: string }) {
  return {
    traceId: input.trace_id ?? 'trace-unavailable',
    modeLabel:
      input.mode === 'live'
        ? 'Live'
        : input.mode === 'cache'
          ? 'Cached'
          : 'Demo mode (live feeds off)',
    reason: input.reason,
    generatedAtLabel: input.generatedAt ? new Date(input.generatedAt).toLocaleString() : undefined
  };
}

export function deriveSlipLearningHighlights(state: SlipTrackingState | null) {
  if (!state) {
    return {
      weakestLeg: null,
      eliminationReason: undefined,
      runbackCandidates: [],
      grudgeGuard: 'No tracked slip yet.'
    };
  }

  const weakestLeg = state.legs.find((leg) => leg.legId === state.eliminatedByLegId) ?? null;
  const eliminationReason = weakestLeg?.missType ?? undefined;
  const runbackCandidates = state.legs.filter(
    (leg) => leg.outcome === 'hit' && (leg.convictionAtBuild ?? 0) >= 70 && leg.volatility !== 'high'
  );

  const grudgeGuard =
    eliminationReason === 'variance' || eliminationReason === 'unknown'
      ? 'Variance miss detected — avoid auto-blacklisting this leg archetype.'
      : eliminationReason
        ? 'Pattern miss detected — reduce same-cluster exposure next run.'
        : 'Slip still alive — keep exposure balanced while tracking.';

  return { weakestLeg, eliminationReason, runbackCandidates, grudgeGuard };
}
