import { randomUUID } from 'node:crypto';

import { DbEventEmitter } from '../control-plane/emitter';
import { buildInsightNode } from '../insights/insightGraph';
import { getRuntimeStore } from '../persistence/runtimeStoreProvider';

export interface EdgeRealizedPayload {
  delta: number;
  expected_value: number;
  realized_value: number;
  was_correct: boolean;
  closing_line_movement: number;
  edge_direction: 'home' | 'away';
}

export async function computeEdgeRealization(input: {
  gameId: string;
  traceId: string;
  runId: string;
  marketImplied: number;
  modelImplied: number;
  homeWon: boolean;
  closingLineMovement: number;
}) {
  const store = getRuntimeStore();
  const emitter = new DbEventEmitter(store);
  const delta = Number((input.modelImplied - input.marketImplied).toFixed(4));
  const expectedValue = Number((input.modelImplied - input.marketImplied).toFixed(4));
  const outcome = input.homeWon ? 1 : 0;
  const realizedValue = Number((outcome - input.marketImplied).toFixed(4));
  const payload: EdgeRealizedPayload = {
    delta,
    expected_value: expectedValue,
    realized_value: realizedValue,
    was_correct: (delta >= 0 && input.homeWon) || (delta < 0 && !input.homeWon),
    closing_line_movement: Number(input.closingLineMovement.toFixed(4)),
    edge_direction: delta >= 0 ? 'home' : 'away'
  };

  await store.saveEdgeRealized({
    id: `edge_${input.gameId}_${randomUUID().slice(0, 8)}`,
    gameId: input.gameId,
    traceId: input.traceId,
    runId: input.runId,
    marketImplied: input.marketImplied,
    modelImplied: input.modelImplied,
    delta,
    outcome: outcome as 0 | 1,
    expectedValue,
    realizedValue,
    wasCorrect: payload.was_correct,
    closingLineMovement: payload.closing_line_movement,
    edgeDirection: payload.edge_direction,
    computedAt: new Date().toISOString()
  });

  const node = buildInsightNode({
    traceId: input.traceId,
    runId: input.runId,
    gameId: input.gameId,
    agentKey: 'edge_realization_engine',
    track: 'hybrid',
    insightType: 'edge_realized',
    claim: `Edge realized ${payload.realized_value >= 0 ? 'positive' : 'negative'} for ${input.gameId}.`,
    confidence: 0.68,
    marketImplied: input.marketImplied,
    modelImplied: input.modelImplied,
    attribution: { model_version: 'live-v0' }
  });

  await store.saveInsightNode({
    insightId: node.insight_id,
    traceId: node.trace_id,
    runId: node.run_id,
    gameId: node.game_id,
    agentKey: node.agent_key,
    track: node.track,
    insightType: node.insight_type,
    claim: node.claim,
    evidence: node.evidence,
    confidence: node.confidence,
    timestamp: node.timestamp,
    decayHalfLife: node.decay_half_life,
    decayHalfLifeMinutes: node.decay_half_life_minutes,
    attribution: {
      sourceBook: node.attribution?.source_book,
      modelVersion: node.attribution?.model_version
    },
    marketImplied: node.market_implied,
    modelImplied: node.model_implied,
    delta: node.delta
  });

  await emitter.emit({
    event_name: 'edge_realized_logged',
    timestamp: new Date().toISOString(),
    request_id: randomUUID(),
    trace_id: input.traceId,
    run_id: input.runId,
    session_id: 'anon',
    user_id: null,
    agent_id: 'metrics',
    model_version: 'live-v0',
    properties: { game_id: input.gameId, ...payload }
  });

  return payload;
}
