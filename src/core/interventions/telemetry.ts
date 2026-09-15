'use client';

import type { BuildThresholdMove } from '@/src/core/slips/buildThresholdAdvisor';

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

export const getInterventionId = interventionId;

export async function emitInterventionEvent(input: {
  eventName: 'intervention_presented' | 'intervention_applied';
  move: BuildThresholdMove;
  context: InterventionTelemetryContext;
}): Promise<void> {
  if (typeof window === 'undefined') return;

  const payload = {
    event_name: input.eventName,
    timestamp: new Date().toISOString(),
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
