import { randomUUID } from 'node:crypto';

import type { EventEmitter } from '../control-plane/emitter';
import type { RuntimeStore } from '../persistence/runtimeStore';
import { getRuntimeStore } from '../persistence/runtimeStoreProvider';

import type { MarketType } from './clv';

interface RecommendationInput {
  parentRecommendationId?: string | null;
  groupId?: string | null;
  sessionId: string;
  userId: string;
  requestId: string;
  traceId: string;
  runId: string;
  agentId: string;
  agentVersion: string;
  gameId: string;
  marketType: MarketType;
  market: string;
  selection: string;
  line?: number | null;
  price?: number | null;
  confidence: number;
  rationale: Record<string, unknown>;
  evidenceRefs: Record<string, unknown>;
}

const persistRecommendation = async (
  recommendationType: 'agent' | 'final',
  input: RecommendationInput,
  store: RuntimeStore,
): Promise<string> => {
  const id = randomUUID();
  await store.saveRecommendation({
    id,
    parentRecommendationId: input.parentRecommendationId ?? null,
    groupId: input.groupId ?? null,
    recommendationType,
    sessionId: input.sessionId,
    userId: input.userId,
    requestId: input.requestId,
    traceId: input.traceId,
    runId: input.runId,
    agentId: input.agentId,
    agentVersion: input.agentVersion,
    gameId: input.gameId,
    marketType: input.marketType,
    market: input.market,
    selection: input.selection,
    line: input.line ?? null,
    price: input.price ?? null,
    confidence: input.confidence,
    rationale: input.rationale,
    evidenceRefs: input.evidenceRefs,
    createdAt: new Date().toISOString(),
  });
  return id;
};

const emitDecisionEvent = async (
  emitter: EventEmitter,
  recommendationId: string,
  input: RecommendationInput,
  role: 'agent' | 'final',
): Promise<void> => {
  await emitter.emit({
    event_name: 'agent_scored_decision',
    timestamp: new Date().toISOString(),
    request_id: input.requestId,
    trace_id: input.traceId,
    run_id: input.runId,
    session_id: input.sessionId,
    user_id: input.userId,
    agent_id: input.agentId,
    model_version: input.agentVersion,
    confidence: input.confidence,
    properties: {
      decision_id: recommendationId,
      market: input.market,
      score: input.confidence,
      rationale: JSON.stringify(input.rationale),
      features: {
        evidence_refs: input.evidenceRefs,
        market_type: input.marketType,
        selection: input.selection,
        role,
      },
    },
  });
};

export const logAgentRecommendation = async (
  input: RecommendationInput,
  emitter: EventEmitter,
  store: RuntimeStore = getRuntimeStore(),
): Promise<string> => {
  const recommendationId = await persistRecommendation('agent', input, store);
  await emitDecisionEvent(emitter, recommendationId, input, 'agent');
  return recommendationId;
};

export const logFinalRecommendation = async (
  input: RecommendationInput,
  emitter: EventEmitter,
  store: RuntimeStore = getRuntimeStore(),
): Promise<string> => {
  const recommendationId = await persistRecommendation('final', input, store);
  await emitDecisionEvent(emitter, recommendationId, input, 'final');
  return recommendationId;
};
