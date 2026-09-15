import type { OpenTicket } from '@/src/core/live/openTickets';
import type { AppliedThresholdIntervention } from '@/src/core/interventions/decisionStore';

export const THRESHOLD_COUNTERFACTUAL_VERSION = 'threshold-counterfactual-v1' as const;

export type ThresholdCounterfactualIneligibilityReason =
  | 'demo_mode'
  | 'settlement_not_verified'
  | 'leg_not_tracked'
  | 'market_mismatch'
  | 'target_line_mismatch'
  | 'missing_final_value';

export type ThresholdCounterfactualEffect =
  | 'preserved_leg'
  | 'cost_leg'
  | 'unchanged_hit'
  | 'unchanged_miss';

export type ThresholdInterventionCounterfactual = {
  methodologyVersion: typeof THRESHOLD_COUNTERFACTUAL_VERSION;
  interventionId: string;
  interventionType: AppliedThresholdIntervention['interventionType'];
  traceId: string;
  slipId?: string | null;
  ticketId: string;
  legId: string;
  player: string;
  marketType: AppliedThresholdIntervention['marketType'];
  currentLine: number;
  targetLine: number;
  finalValue: number | null;
  eligible: boolean;
  ineligibilityReason: ThresholdCounterfactualIneligibilityReason | null;
  originalLegSurvived: boolean | null;
  recommendedLegSurvived: boolean | null;
  effect: ThresholdCounterfactualEffect | null;
};

const sameLine = (a: number, b: number) => Math.abs(a - b) < 0.001;

const ineligible = (
  ticket: OpenTicket,
  intervention: AppliedThresholdIntervention,
  reason: ThresholdCounterfactualIneligibilityReason,
  finalValue: number | null,
): ThresholdInterventionCounterfactual => ({
  methodologyVersion: THRESHOLD_COUNTERFACTUAL_VERSION,
  interventionId: intervention.interventionId,
  interventionType: intervention.interventionType,
  traceId: intervention.traceId,
  slipId: intervention.slipId,
  ticketId: ticket.ticketId,
  legId: intervention.legId,
  player: intervention.player,
  marketType: intervention.marketType,
  currentLine: intervention.currentLine,
  targetLine: intervention.targetLine,
  finalValue,
  eligible: false,
  ineligibilityReason: reason,
  originalLegSurvived: null,
  recommendedLegSurvived: null,
  effect: null,
});

export function evaluateThresholdInterventionCounterfactual(input: {
  ticket: OpenTicket;
  intervention: AppliedThresholdIntervention;
  finalValues: Record<string, number>;
}): ThresholdInterventionCounterfactual {
  const { ticket, intervention, finalValues } = input;
  const leg = ticket.legs.find((candidate) => candidate.legId === intervention.legId);
  const candidateFinalValue = finalValues[intervention.legId];
  const finalValue = typeof candidateFinalValue === 'number' && Number.isFinite(candidateFinalValue)
    ? candidateFinalValue
    : null;

  if (ticket.mode === 'demo' || ticket.provenance?.mode === 'demo') {
    return ineligible(ticket, intervention, 'demo_mode', finalValue);
  }
  if (ticket.provenance?.review_state !== 'verified') {
    return ineligible(ticket, intervention, 'settlement_not_verified', finalValue);
  }
  if (!leg) return ineligible(ticket, intervention, 'leg_not_tracked', finalValue);
  if (leg.marketType !== intervention.marketType) {
    return ineligible(ticket, intervention, 'market_mismatch', finalValue);
  }
  if (!sameLine(leg.threshold, intervention.targetLine)) {
    return ineligible(ticket, intervention, 'target_line_mismatch', finalValue);
  }
  if (finalValue === null) {
    return ineligible(ticket, intervention, 'missing_final_value', null);
  }

  // Threshold Advisor only applies displayed "+" thresholds, so v1 uses at-least semantics.
  const originalLegSurvived = finalValue >= intervention.currentLine;
  const recommendedLegSurvived = finalValue >= intervention.targetLine;
  const effect: ThresholdCounterfactualEffect = originalLegSurvived === recommendedLegSurvived
    ? originalLegSurvived
      ? 'unchanged_hit'
      : 'unchanged_miss'
    : recommendedLegSurvived
      ? 'preserved_leg'
      : 'cost_leg';

  return {
    methodologyVersion: THRESHOLD_COUNTERFACTUAL_VERSION,
    interventionId: intervention.interventionId,
    interventionType: intervention.interventionType,
    traceId: intervention.traceId,
    slipId: intervention.slipId,
    ticketId: ticket.ticketId,
    legId: intervention.legId,
    player: intervention.player,
    marketType: intervention.marketType,
    currentLine: intervention.currentLine,
    targetLine: intervention.targetLine,
    finalValue,
    eligible: true,
    ineligibilityReason: null,
    originalLegSurvived,
    recommendedLegSurvived,
    effect,
  };
}

export function buildThresholdCounterfactuals(input: {
  ticket: OpenTicket;
  interventions: AppliedThresholdIntervention[];
  finalValues: Record<string, number>;
}): ThresholdInterventionCounterfactual[] {
  const byLeg = new Map<string, AppliedThresholdIntervention>();
  const latestFirst = [...input.interventions].sort(
    (a, b) => Date.parse(b.appliedAt) - Date.parse(a.appliedAt),
  );

  for (const intervention of latestFirst) {
    if (!byLeg.has(intervention.legId)) byLeg.set(intervention.legId, intervention);
  }

  return [...byLeg.values()].map((intervention) =>
    evaluateThresholdInterventionCounterfactual({
      ticket: input.ticket,
      intervention,
      finalValues: input.finalValues,
    }),
  );
}
