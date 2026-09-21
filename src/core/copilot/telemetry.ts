'use client';

import type { BuildCopilotRead } from '@/src/core/copilot/buildDecision';
import type { CopilotDecisionRecord } from '@/src/core/copilot/decisionStore';

export type CopilotTelemetryContext = {
  traceId: string;
  slipId?: string | null;
  sport?: string;
  tz?: string;
  date?: string;
  mode?: 'live' | 'cache' | 'demo';
};

const postEvent = async (payload: Record<string, unknown>) => {
  try {
    await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    // Copilot telemetry must never block the bettor action.
  }
};

export async function emitCopilotDecisionPresented(input: {
  record: CopilotDecisionRecord;
  read: BuildCopilotRead;
  context: CopilotTelemetryContext;
}): Promise<void> {
  if (typeof window === 'undefined') return;
  await postEvent({
    event_name: 'copilot_decision_presented',
    timestamp: new Date().toISOString(),
    request_id: crypto.randomUUID(),
    trace_id: input.context.traceId,
    agent_id: 'build_decision_copilot',
    model_version: 'build-copilot-v1',
    mode: input.context.mode,
    sport: input.context.sport,
    tz: input.context.tz,
    date: input.context.date,
    properties: {
      decision_id: input.record.decisionId,
      slip_id: input.context.slipId ?? null,
      intent: input.read.intent,
      ticket_fingerprint: input.record.ticketFingerprint,
      evidence_state: input.read.evidenceState,
      action_kind: input.read.action.kind,
      action_label: input.read.action.label,
      target_leg_id: input.record.targetLegId ?? null,
      current_line: input.record.currentLine ?? null,
      target_line: input.record.targetLine ?? null,
      headline: input.read.headline,
      pressure: input.read.pressure,
    },
  });
}

export async function emitCopilotActionApplied(input: {
  record: CopilotDecisionRecord;
  context: CopilotTelemetryContext;
}): Promise<void> {
  if (typeof window === 'undefined') return;
  await postEvent({
    event_name: 'copilot_action_applied',
    timestamp: new Date().toISOString(),
    request_id: crypto.randomUUID(),
    trace_id: input.context.traceId,
    agent_id: 'build_decision_copilot',
    model_version: 'build-copilot-v1',
    mode: input.context.mode,
    sport: input.context.sport,
    tz: input.context.tz,
    date: input.context.date,
    properties: {
      decision_id: input.record.decisionId,
      slip_id: input.context.slipId ?? null,
      intent: input.record.intent,
      ticket_fingerprint: input.record.ticketFingerprint,
      evidence_state: input.record.evidenceState,
      action_kind: input.record.actionKind,
      action_label: input.record.actionLabel,
      target_leg_id: input.record.targetLegId ?? null,
      current_line: input.record.currentLine ?? null,
      target_line: input.record.targetLine ?? null,
    },
  });
}
