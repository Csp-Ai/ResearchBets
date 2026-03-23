import type { LifecycleActionGuidance } from '@/src/core/slips/lifecycleActionGuidance';
import type {
  LifecycleContinuityEvidenceInput,
  LifecycleEvidence
} from '@/src/core/slips/lifecycleEvidence';
import type { LifecycleRisk, LifecycleRiskStage } from '@/src/core/slips/lifecycleRisk';

export type TicketThesisStatus =
  | 'holding'
  | 'watching'
  | 'under_pressure'
  | 'broke'
  | 'resolved_cleanly'
  | 'mixed_close';

export type TicketThesis = {
  headline: string;
  subheadline: string;
  current_thesis: string;
  primary_pressure: string;
  recommended_next_step: string;
  why_now: string;
  continuity_read: string | null;
  thesis_status: TicketThesisStatus;
  reliability_note: string | null;
  driver_tags: string[];
};

const DRIVER_THESIS_COPY: Record<LifecycleRisk['primaryDriver'], string> = {
  balanced_build: 'the structure is staying compact',
  inflated_thresholds: 'stretched thresholds are carrying too much of the ask',
  volatile_secondary_stats: 'volatile support stats are doing too much work',
  correlated_stack_pressure: 'the same scoring dependency is carrying too much of the ticket',
  late_game_dependency: 'late-game script still decides too much of the outcome',
  role_mismatch: 'role fit is thinner than the market ask',
  hot_hand_regression_risk: 'heater-style efficiency is still propping up the build',
  low_evidence: 'support behind the read is still thin'
};

function unique<T>(values: T[]): T[] {
  return values.filter((value, index) => values.indexOf(value) === index);
}

function buildWhyNow(evidence: LifecycleEvidence): string {
  if (evidence.secondary_evidence) {
    return `${evidence.primary_evidence.label} · ${evidence.secondary_evidence.label}`;
  }
  return evidence.primary_evidence.label;
}

function buildContinuityRead(
  evidence: LifecycleEvidence,
  guidance: LifecycleActionGuidance,
  continuity?: LifecycleContinuityEvidenceInput
): string | null {
  if (evidence.continuity_evidence) return evidence.continuity_evidence;
  if (guidance.continuity_note) return guidance.continuity_note;
  if (/carrying|pressure point|weakest leg|strongest leg/i.test(evidence.stage_note)) return evidence.stage_note;
  if (continuity?.mixed_outcome) return 'The close stayed mixed, so continuity support is limited.';
  if (continuity?.push_void_heavy) return 'Push/void-heavy settlement keeps continuity support limited.';
  return null;
}

function statusFromInput(input: {
  stage: LifecycleRiskStage;
  risk: LifecycleRisk;
  evidence: LifecycleEvidence;
  outcome?: 'won' | 'lost' | 'void' | 'mixed' | 'partial';
  continuity?: LifecycleContinuityEvidenceInput;
}): TicketThesisStatus {
  const { stage, risk, evidence, outcome, continuity } = input;

  if (stage === 'before') {
    if (evidence.evidence_strength === 'thin') return 'watching';
    if (risk.level === 'stable') return 'holding';
    if (risk.level === 'watch') return 'watching';
    return 'under_pressure';
  }

  if (stage === 'during') {
    if (evidence.evidence_strength === 'thin' && risk.level !== 'high-pressure') return 'watching';
    if (risk.level === 'stable') return 'holding';
    if (risk.level === 'watch') return 'watching';
    return 'under_pressure';
  }

  if (outcome === 'won' && risk.level === 'stable') return 'resolved_cleanly';
  if (risk.carriedThrough || continuity?.repeated_break_pattern || outcome === 'lost') return 'broke';
  if (outcome === 'mixed' || outcome === 'partial' || outcome === 'void') return 'mixed_close';
  if (continuity?.push_void_heavy || continuity?.mixed_outcome) return 'mixed_close';
  return outcome === 'won' ? 'resolved_cleanly' : 'mixed_close';
}

function headlineFor(input: {
  stage: LifecycleRiskStage;
  status: TicketThesisStatus;
  risk: LifecycleRisk;
  evidence: LifecycleEvidence;
  outcome?: 'won' | 'lost' | 'void' | 'mixed' | 'partial';
}): string {
  const { stage, status, risk, evidence } = input;

  if (stage === 'before') {
    if (status === 'holding') return 'Ticket looks stable, but keep one pressure point in view.';
    if (status === 'watching') {
      return evidence.evidence_strength === 'thin'
        ? 'Thin evidence keeps this ticket advisory-only.'
        : 'Ticket is playable, but one pressure point needs watching.';
    }
    return 'Ticket is fragile before submit.';
  }

  if (stage === 'during') {
    if (status === 'holding') return 'Original ticket thesis is still holding live.';
    if (status === 'watching') return 'Live read is still watchful, not broken.';
    return 'Ticket is now under pressure live.';
  }

  if (status === 'resolved_cleanly') return 'Ticket resolved cleanly and the compact read held.';
  if (status === 'mixed_close') return 'Ticket closed mixed, so the final read stays conservative.';
  return 'Ticket thesis broke along the same pressure line.';
}

function subheadlineFor(input: {
  stage: LifecycleRiskStage;
  status: TicketThesisStatus;
  risk: LifecycleRisk;
  continuityRead: string | null;
  outcome?: 'won' | 'lost' | 'void' | 'mixed' | 'partial';
}): string {
  const { stage, status, risk, continuityRead, outcome } = input;
  const pressure = risk.pressureLabel.toLowerCase();

  if (stage === 'before') {
    if (status === 'holding') return `${risk.headline} Main pre-submit pressure stays ${pressure}.`;
    if (status === 'watching') return `${risk.headline} Keep the build compact before adding more dependency.`;
    return `${risk.headline} Cut exposure before this structure carries more risk than edge.`;
  }

  if (stage === 'during') {
    if (status === 'holding') return continuityRead ?? 'The same core shape still looks intact, so stay disciplined.';
    if (status === 'watching') return continuityRead ?? 'Pressure is readable, but the live evidence is not decisive yet.';
    return continuityRead ?? 'The live pressure is concentrating instead of dispersing.';
  }

  if (status === 'resolved_cleanly') {
    return continuityRead ?? 'No single fragility driver took over at settlement.';
  }
  if (status === 'mixed_close') {
    return continuityRead ?? (outcome === 'void'
      ? 'No graded edge closed the story cleanly.'
      : 'The close did not support one clean carry-through story.');
  }
  return continuityRead ?? 'The same pressure line stayed visible through settlement.';
}

function currentThesisFor(stage: LifecycleRiskStage, status: TicketThesisStatus, risk: LifecycleRisk): string {
  const driverRead = DRIVER_THESIS_COPY[risk.primaryDriver];

  if (stage === 'before') {
    if (status === 'holding') return `You are holding a compact ticket, but ${driverRead}.`;
    if (status === 'watching') return `You are holding a ticket that can stay intact if ${driverRead}.`;
    return `You are holding a fragile ticket because ${driverRead}.`;
  }

  if (stage === 'during') {
    if (status === 'holding') return `The original read is still intact because ${driverRead}.`;
    if (status === 'watching') return `The ticket is still live, but ${driverRead}.`;
    return `The live thesis is straining because ${driverRead}.`;
  }

  if (status === 'resolved_cleanly') return `The closing result stayed in line because ${driverRead}.`;
  if (status === 'mixed_close') return `The close stayed noisy because ${driverRead}.`;
  return `The closing review says the thesis broke because ${driverRead}.`;
}

export function deriveTicketThesis(input: {
  stage: LifecycleRiskStage;
  risk: LifecycleRisk;
  guidance: LifecycleActionGuidance;
  evidence: LifecycleEvidence;
  continuity?: LifecycleContinuityEvidenceInput;
  outcome?: 'won' | 'lost' | 'void' | 'mixed' | 'partial';
}): TicketThesis {
  const { stage, risk, guidance, evidence, continuity, outcome } = input;
  const continuityRead = buildContinuityRead(evidence, guidance, continuity);
  const thesisStatus = statusFromInput({ stage, risk, evidence, outcome, continuity });
  const reliabilityNote = evidence.reliability_note ?? evidence.confidence_note ?? guidance.continuity_note ?? null;

  return {
    headline: headlineFor({ stage, status: thesisStatus, risk, evidence, outcome }),
    subheadline: subheadlineFor({ stage, status: thesisStatus, risk, continuityRead, outcome }),
    current_thesis: currentThesisFor(stage, thesisStatus, risk),
    primary_pressure: risk.primaryDriver === 'balanced_build' && stage !== 'after'
      ? 'No dominant fragility driver is taking over right now.'
      : risk.detail,
    recommended_next_step: guidance.action_label,
    why_now: buildWhyNow(evidence),
    continuity_read: continuityRead,
    thesis_status: thesisStatus,
    reliability_note: reliabilityNote,
    driver_tags: unique(guidance.driver_tags)
  };
}
