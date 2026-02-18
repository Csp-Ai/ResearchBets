'use client';

import { createClientRequestId } from '../identifiers/session';

export type ActionSource = 'live' | 'cache' | 'demo';
export type ActionEnvelope<T> = { ok: boolean; data?: T; degraded?: boolean; source?: ActionSource; error_code?: string };

async function emitUiActionEvent(input: {
  eventName: 'ui_action_started' | 'ui_action_succeeded' | 'ui_action_failed';
  traceId: string;
  actionId: string;
  actionName: string;
  requestId: string;
  properties?: Record<string, unknown>;
}): Promise<void> {
  await fetch('/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event_name: input.eventName,
      timestamp: new Date().toISOString(),
      request_id: input.requestId,
      trace_id: input.traceId,
      run_id: input.actionId,
      session_id: 'client',
      user_id: 'client',
      agent_id: 'ui',
      model_version: 'ui-contract-v1',
      properties: { action_id: input.actionId, action_name: input.actionName, ...(input.properties ?? {}) },
    }),
  });
}

export async function runUiAction<T>(input: {
  actionName: string;
  traceId?: string;
  actionId?: string;
  requestId?: string;
  properties?: Record<string, unknown>;
  execute: () => Promise<ActionEnvelope<T>>;
}): Promise<ActionEnvelope<T>> {
  const traceId = input.traceId ?? createClientRequestId();
  const actionId = input.actionId ?? createClientRequestId();
  const requestId = input.requestId ?? createClientRequestId();

  await emitUiActionEvent({
    eventName: 'ui_action_started',
    traceId,
    actionId,
    actionName: input.actionName,
    requestId,
    properties: input.properties,
  });

  try {
    const envelope = await input.execute();
    if (envelope.ok) {
      await emitUiActionEvent({
        eventName: 'ui_action_succeeded',
        traceId,
        actionId,
        actionName: input.actionName,
        requestId,
        properties: { ...input.properties, source: envelope.source, degraded: envelope.degraded ?? false },
      });
      return envelope;
    }

    await emitUiActionEvent({
      eventName: 'ui_action_failed',
      traceId,
      actionId,
      actionName: input.actionName,
      requestId,
      properties: { ...input.properties, error_code: envelope.error_code ?? 'action_failed' },
    });
    return envelope;
  } catch (error) {
    await emitUiActionEvent({
      eventName: 'ui_action_failed',
      traceId,
      actionId,
      actionName: input.actionName,
      requestId,
      properties: { ...input.properties, error_code: 'exception', message: error instanceof Error ? error.message : 'unknown' },
    });
    return { ok: false, source: 'demo', error_code: 'exception' };
  }
}
