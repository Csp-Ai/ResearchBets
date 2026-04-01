import type { CorrelationEdge } from '@/src/core/contracts/slipStructureReport';

export type LifecycleStage = 'board' | 'slip' | 'track' | 'review';
export type LabelMode = 'predictive' | 'observed' | 'descriptive';
export type WeakestLegStageRole = 'candidate' | 'pressure_point' | 'breaking_leg';
export type ContinuityStatus = 'carried_forward' | 'changed' | 'newly_observed';
export type ConfidenceTier = 'Strong' | 'Solid' | 'Thin' | 'Fragile';
export type FragilityTier = 'Low' | 'Watch' | 'Fragile' | 'High-pressure';
export type CorrelationSeverity = 'none' | 'watch' | 'elevated' | 'severe';

export type LifecycleDriver =
  | 'balanced_build'
  | 'inflated_thresholds'
  | 'volatile_secondary_stats'
  | 'correlated_stack_pressure'
  | 'late_game_dependency'
  | 'role_mismatch'
  | 'hot_hand_regression_risk'
  | 'low_evidence';

export type WeakestLegIdentity = {
  canonical_leg_id: string | null;
  stage_role: WeakestLegStageRole;
  source_stage: LifecycleStage;
  continuity_status: ContinuityStatus;
  supporting_drivers: LifecycleDriver[];
};

export type LifecycleDriverLineage = {
  pregame?: WeakestLegIdentity;
  live?: WeakestLegIdentity;
  settled?: WeakestLegIdentity;
};

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

export function normalizeRateLike(
  input: number | null | undefined,
  fallback = 55
): { pct: number; source: 'fraction' | 'percent' | 'fallback' } {
  if (typeof input !== 'number' || !Number.isFinite(input)) {
    return { pct: clamp(fallback), source: 'fallback' };
  }
  if (input >= 0 && input <= 1) {
    return { pct: clamp(input * 100), source: 'fraction' };
  }
  return { pct: clamp(input), source: 'percent' };
}

export function confidenceTierFromPct(confidencePct: number): ConfidenceTier {
  if (confidencePct >= 70) return 'Strong';
  if (confidencePct >= 60) return 'Solid';
  if (confidencePct >= 50) return 'Thin';
  return 'Fragile';
}

export function fragilityTierFromScore(fragilityScore: number): FragilityTier {
  if (fragilityScore >= 70) return 'High-pressure';
  if (fragilityScore >= 55) return 'Fragile';
  if (fragilityScore >= 40) return 'Watch';
  return 'Low';
}

const CORRELATION_KIND_WEIGHT: Record<CorrelationEdge['kind'], number> = {
  same_player: 34,
  same_team: 22,
  same_game: 14,
  script_overlap: 16,
  other: 8
};

const CORRELATION_SEVERITY_WEIGHT: Record<CorrelationEdge['severity'], number> = {
  high: 18,
  med: 10,
  low: 4
};

export function correlationSeverityFromEdges(edges: CorrelationEdge[]): {
  severity: CorrelationSeverity;
  score: number;
} {
  if (!edges.length) return { severity: 'none', score: 0 };
  const weighted = edges.reduce(
    (sum, edge) => sum + CORRELATION_KIND_WEIGHT[edge.kind] + CORRELATION_SEVERITY_WEIGHT[edge.severity],
    0
  );
  const score = clamp(weighted);
  if (score >= 70) return { severity: 'severe', score };
  if (score >= 45) return { severity: 'elevated', score };
  return { severity: 'watch', score };
}

export function buildWeakestLegIdentity(input: {
  canonical_leg_id: string | null;
  stage_role: WeakestLegStageRole;
  source_stage: LifecycleStage;
  previous_leg_id?: string | null;
  supporting_drivers?: LifecycleDriver[];
}): WeakestLegIdentity {
  const continuity_status: ContinuityStatus =
    input.previous_leg_id == null
      ? 'newly_observed'
      : input.previous_leg_id === input.canonical_leg_id
        ? 'carried_forward'
        : 'changed';
  return {
    canonical_leg_id: input.canonical_leg_id,
    stage_role: input.stage_role,
    source_stage: input.source_stage,
    continuity_status,
    supporting_drivers: input.supporting_drivers ?? []
  };
}

export function labelForMode(input: {
  mode: LabelMode;
  confidenceTier: ConfidenceTier;
  fragilityTier: FragilityTier;
  correlationSeverity: CorrelationSeverity;
}): string {
  if (input.mode === 'predictive') {
    if (input.fragilityTier === 'High-pressure') return 'fragile setup';
    if (input.correlationSeverity !== 'none') return 'correlation watch';
    return input.confidenceTier === 'Strong' ? 'high-confidence setup' : 'weakest-leg candidate';
  }
  if (input.mode === 'observed') {
    if (input.fragilityTier === 'High-pressure' || input.correlationSeverity === 'severe') return 'pressure rising';
    return 'highest-pressure leg';
  }
  if (input.correlationSeverity === 'none' && input.fragilityTier === 'Low') return 'clean close';
  return 'breaking leg';
}

export function canUseHighConfidencePlay(input: {
  confidenceTier: ConfidenceTier;
  fragilityTier: FragilityTier;
  correlationSeverity: CorrelationSeverity;
  sourceQuality?: 'high' | 'mixed' | 'low';
}): boolean {
  return (
    input.confidenceTier === 'Strong' &&
    (input.fragilityTier === 'Low' || input.fragilityTier === 'Watch') &&
    (input.correlationSeverity === 'none' || input.correlationSeverity === 'watch') &&
    (input.sourceQuality == null || input.sourceQuality !== 'low')
  );
}
