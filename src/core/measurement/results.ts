import { randomUUID } from 'node:crypto';

import type { EventEmitter } from '../control-plane/emitter';
import type { RuntimeStore } from '../persistence/runtimeStore';
import { getRuntimeStore } from '../persistence/runtimeStoreProvider';

export const ingestGameResult = async (
  gameId: string,
  payload: Record<string, unknown>,
  requestContext: {
    requestId: string;
    traceId: string;
    runId: string;
    sessionId: string;
    userId: string;
    agentId: string;
    modelVersion: string;
  },
  emitter: EventEmitter,
  store: RuntimeStore = getRuntimeStore(),
): Promise<void> => {
  const completedAt = (payload.completed_at as string | undefined) ?? new Date().toISOString();
  await store.saveGameResult({
    id: randomUUID(),
    gameId,
    payload,
    completedAt,
    createdAt: new Date().toISOString(),
  });

  await emitter.emit({
    event_name: 'user_outcome_recorded',
    timestamp: new Date().toISOString(),
    request_id: requestContext.requestId,
    trace_id: requestContext.traceId,
    run_id: requestContext.runId,
    session_id: requestContext.sessionId,
    user_id: requestContext.userId,
    agent_id: requestContext.agentId,
    model_version: requestContext.modelVersion,
    properties: {
      outcome_id: `result_${gameId}`,
      bet_id: gameId,
      settlement_status: 'pending',
      pnl_amount: 0,
      settled_at: completedAt,
    },
  });
};
