import type {
  LifecycleRisk,
  LifecycleRiskDriver,
  LifecycleRiskStage
} from '@/src/core/slips/lifecycleRisk';
import type { LifecycleActionGuidance } from '@/src/core/slips/lifecycleActionGuidance';

export type LifecycleEvidenceStrength = 'thin' | 'mixed' | 'clear' | 'strong';

export type LifecycleEvidenceItemKey =
  | 'balanced_build'
  | 'inflated_thresholds'
  | 'volatile_secondary_stats'
  | 'correlated_stack_pressure'
  | 'late_game_dependency'
  | 'role_mismatch'
  | 'hot_hand_regression_risk'
  | 'low_evidence'
  | 'weakest_leg_pressure'
  | 'strongest_leg_support'
  | 'repeated_break_pattern'
  | 'push_void_heavy_close'
  | 'mixed_close';

export type LifecycleEvidenceItem = {
  key: LifecycleEvidenceItemKey;
  label: string;
};

export type LifecycleContinuityEvidenceInput = {
  strongest_leg_label?: string | null;
  weakest_leg_label?: string | null;
  repeated_break_pattern?: boolean;
  mixed_outcome?: boolean;
  push_void_heavy?: boolean;
};

export type LifecycleEvidence = {
  primary_evidence: LifecycleEvidenceItem;
  secondary_evidence: LifecycleEvidenceItem | null;
  driver_evidence: LifecycleEvidenceItem[];
  evidence_strength: LifecycleEvidenceStrength;
  continuity_evidence: string | null;
  stage_note: string;
  reliability_note: string | null;
  confidence_note: string | null;
};

const DRIVER_EVIDENCE_COPY: Record<LifecycleRiskDriver, LifecycleEvidenceItem> = {
  balanced_build: { key: 'balanced_build', label: 'Balanced build stayed compact' },
  inflated_thresholds: { key: 'inflated_thresholds', label: 'Aggressive ladder concentration' },
  volatile_secondary_stats: {
    key: 'volatile_secondary_stats',
    label: 'Secondary-stat volatility is driving the read'
  },
  correlated_stack_pressure: {
    key: 'correlated_stack_pressure',
    label: 'Correlated scoring dependency is concentrated'
  },
  late_game_dependency: {
    key: 'late_game_dependency',
    label: 'Late-game dependency is still deciding too much'
  },
  role_mismatch: { key: 'role_mismatch', label: 'Role fit is carrying the miss risk' },
  hot_hand_regression_risk: {
    key: 'hot_hand_regression_risk',
    label: 'Heater-style efficiency is doing too much work'
  },
  low_evidence: { key: 'low_evidence', label: 'Support behind the read is still thin' }
};

function evidenceItemFromDriver(driver: LifecycleRiskDriver): LifecycleEvidenceItem {
  return DRIVER_EVIDENCE_COPY[driver];
}

function toEvidenceStrength(risk: LifecycleRisk): LifecycleEvidenceStrength {
  const primaryScore = risk.evidence[0]?.score ?? 0;
  const secondaryScore = risk.evidence[1]?.score ?? 0;
  const scoreGap = primaryScore - secondaryScore;

  if (risk.reliability === 'low' || risk.primaryDriver === 'low_evidence') return 'thin';
  if (risk.carriedThrough || primaryScore >= 66) return 'strong';
  if (secondaryScore >= 28 && scoreGap <= 10) return 'mixed';
  return 'clear';
}

function buildSecondaryEvidence(
  risk: LifecycleRisk,
  stage: LifecycleRiskStage,
  continuity?: LifecycleContinuityEvidenceInput
): LifecycleEvidenceItem | null {
  if (risk.secondaryDriver) return evidenceItemFromDriver(risk.secondaryDriver);
  if (stage === 'during' && continuity?.weakest_leg_label) {
    return {
      key: 'weakest_leg_pressure',
      label: `Weakest leg pressure is concentrated on ${continuity.weakest_leg_label}`
    };
  }
  if (stage === 'after' && continuity?.repeated_break_pattern) {
    return {
      key: 'repeated_break_pattern',
      label: 'Settled history preserved the same break pattern'
    };
  }
  if (stage === 'after' && continuity?.push_void_heavy) {
    return {
      key: 'push_void_heavy_close',
      label: 'Closing result stayed push/void heavy'
    };
  }
  return null;
}

function buildContinuityEvidence(
  risk: LifecycleRisk,
  stage: LifecycleRiskStage,
  continuity?: LifecycleContinuityEvidenceInput
): string | null {
  if (risk.carriedThrough) {
    return stage === 'during'
      ? 'Same pre-submit driver still active live.'
      : 'Same driver carried through to settlement.';
  }
  if (stage === 'after' && continuity?.repeated_break_pattern) {
    return 'Pre-submit warning matched the final break pattern.';
  }
  if (stage === 'after' && continuity?.push_void_heavy) {
    return 'Carry-through stays limited because the close was push/void heavy.';
  }
  if (stage === 'after' && continuity?.mixed_outcome) {
    return 'Carry-through stays limited because the close finished mixed.';
  }
  if (stage === 'after') {
    return 'No meaningful continuity support was preserved.';
  }
  return null;
}

function buildStageNote(
  risk: LifecycleRisk,
  stage: LifecycleRiskStage,
  continuity?: LifecycleContinuityEvidenceInput
): string {
  if (stage === 'before') {
    return risk.secondaryDriver
      ? 'Mixed signals are present, but one driver is still leading the read.'
      : 'Use this as a compact pre-submit scan, not a full rewrite.';
  }
  if (stage === 'during') {
    if (continuity?.strongest_leg_label && continuity?.weakest_leg_label) {
      return `${continuity.strongest_leg_label} is carrying while ${continuity.weakest_leg_label} is setting the pressure.`;
    }
    if (continuity?.weakest_leg_label) {
      return `${continuity.weakest_leg_label} is the main live pressure point right now.`;
    }
    return 'Keep the live read anchored to strongest-leg and weakest-leg confirmation.';
  }
  if (continuity?.push_void_heavy) {
    return 'Keep the close conservative; too much of the result was push/void driven.';
  }
  if (continuity?.mixed_outcome) {
    return 'The close stayed mixed, so review the break cluster instead of forcing one story.';
  }
  return 'Treat this as the recorded closing lesson, not a broader causal claim.';
}

function buildReliabilityNote(
  risk: LifecycleRisk,
  strength: LifecycleEvidenceStrength
): string | null {
  if (strength === 'thin') return 'Thin support — keep the action guidance conservative.';
  if (strength === 'mixed') return 'Mixed support — one driver leads, but the read is not clean.';
  if (risk.reliability === 'high') return 'Reliable support from the current deterministic read.';
  return null;
}

function buildConfidenceNote(
  risk: LifecycleRisk,
  guidance: LifecycleActionGuidance
): string | null {
  if (risk.reliability === 'low') return null;
  if (guidance.continuity_note) return guidance.continuity_note;
  return risk.reliability === 'high' ? 'Confidence is supported by preserved signal strength.' : null;
}

export function deriveLifecycleEvidence(input: {
  risk: LifecycleRisk;
  guidance: LifecycleActionGuidance;
  stage: LifecycleRiskStage;
  continuity?: LifecycleContinuityEvidenceInput;
}): LifecycleEvidence {
  const { risk, guidance, stage, continuity } = input;
  const evidenceStrength = toEvidenceStrength(risk);
  const primaryEvidence = evidenceItemFromDriver(risk.primaryDriver);
  const secondaryEvidence = buildSecondaryEvidence(risk, stage, continuity);
  const driverEvidence = [
    primaryEvidence,
    ...(secondaryEvidence ? [secondaryEvidence] : []),
    ...risk.evidence.slice(1, 3).map((item) => evidenceItemFromDriver(item.driver))
  ].filter((item, index, items) => items.findIndex((candidate) => candidate.key === item.key) === index);

  return {
    primary_evidence: primaryEvidence,
    secondary_evidence: secondaryEvidence,
    driver_evidence: driverEvidence,
    evidence_strength: evidenceStrength,
    continuity_evidence: buildContinuityEvidence(risk, stage, continuity),
    stage_note: buildStageNote(risk, stage, continuity),
    reliability_note: buildReliabilityNote(risk, evidenceStrength),
    confidence_note: buildConfidenceNote(risk, guidance)
  };
}
