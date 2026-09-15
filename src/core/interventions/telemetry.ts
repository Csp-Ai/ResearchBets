'use client';

import type { BuildThresholdMove } from '@/src/core/slips/buildThresholdAdvisor';
import {
  saveAppliedIntervention,
  type AppliedThresholdIntervention,
} from '@/src/core/interventions/decisionStore';
import type { ThresholdInterventionCounterfactual } from '@/src/core/interventions/counterfactual';

export type InterventionTelemetryContext = {
  traceId: string;
  slipId?: string | null;
  sport?: string;
  tz?: string;
  date?: string;
  mode?: 'live' | 'cache' | 'demo';
};

const interventionId = (move: BuildThresholdMove, context: InterventionTelemetryContext) =>
  [
    context.traceId,
    move.kind,
    move.legId,
    move.currentLine,
    move.targetLine,
  ].join(':');

const eventProperties = (move: BuildThresholdMove, context: InterventionTelemetryContext) => ({
  intervention_id: interventionId(move, context),
  intervention_type: move.kind,
  leg_id: move.legId,
  player: move.player,
  market_type: move.marketType,
  current_line: move.currentLine,
  target_line: move.targetLine,
  current_probability: move.currentProbability,
  target_probability: move.targetProbability,
  probability_delta: move.probabilityDelta,
  current_price_stack_proxy: move.before.priceStackProbability,
  target_price_stack_proxy: move.after.priceStackProbability,
  before_status: move.before.status,
  after_status: move.after.status,
  slip_id: context.slipId ?? null,
});

const appliedRecord = (
  move: BuildThresholdMove,
  context: InterventionTelemetryContext,
  appliedAt: string,
): AppliedThresholdIntervention => ({
  interventionId: interventionId(move, context),
  appliedAt,
  traceId: context.traceId,
  slipId: context.slipId,
  mode: context.mode,
  interventionType: move.kind,
  legId: move.legId,
  player: move.player,
  marketType: move.marketType,
  currentLine: move.currentLine,
  targetLine: move.targetLine,
  currentProbability: move.currentProbability,
  targetProbability: move.targetProbability,
  probabilityDelta: move.probabilityDelta,
});

export const getInterventionId = interventionId;

export async function emitInterventionEvent(input: {
  eventName: 'intervention_presented' | 'intervention_applied';
  move: BuildThresholdMove;
  context: InterventionTelemetryContext;
}): Promise<void> {
  if (typeof window === 'undefined') return;

  const timestamp = new Date().toISOString();
  if (input.eventName === 'intervention_applied') {
    saveAppliedIntervention(appliedRecord(input.move, input.context, timestamp));
  }

  const payload = {
    event_name: input.eventName,
    timestamp,
    request_id: crypto.randomUUID(),
    trace_id: input.context.traceId,
    agent_id: 'threshold_advisor',
    model_version: 'threshold-advisor-v1',
    mode: input.context.mode,
    sport: input.context.sport,
    tz: input.context.tz,
    date: input.context.date,
    properties: eventProperties(input.move, input.context),
  };

  try {
    await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    // Telemetry must never block a bettor action.
  }
}

export async function emitInterventionSettlementLinked(input: {
  counterfactual: ThresholdInterventionCounterfactual;
  mode?: 'live' | 'cache' | 'demo';
}): Promise<void> {
  if (typeof window === 'undefined') return;

  const counterfactual = input.counterfactual;
  const payload = {
    event_name: 'intervention_settlement_linked',
    timestamp: new Date().toISOString(),
    request_id: crypto.randomUUID(),
    trace_id: counterfactual.traceId,
    agent_id: 'threshold_advisor',
    model_version: counterfactual.methodologyVersion,
    mode: input.mode,
    properties: {
      intervention_id: counterfactual.interventionId,
      intervention_type: counterfactual.interventionType,
      ticket_id: counterfactual.ticketId,
      slip_id: counterfactual.slipId ?? null,
      leg_id: counterfactual.legId,
      player: counterfactual.player,
      market_type: counterfactual.marketType,
      current_line: counterfactual.currentLine,
      target_line: counterfactual.targetLine,
      final_value: counterfactual.finalValue,
      settlement_verification: counterfactual.eligible ? 'verified' : 'not_verified',
      counterfactual_eligible: counterfactual.eligible,
      ineligibility_reason: counterfactual.ineligibilityReason,
      original_leg_survived: counterfactual.originalLegSurvived,
      recommended_leg_survived: counterfactual.recommendedLegSurvived,
      counterfactual_effect: counterfactual.effect,
      methodology_version: counterfactual.methodologyVersion,
    },
  };

  try {
    await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    // Settlement telemetry is best-effort and never blocks saving the review.
  }
}
