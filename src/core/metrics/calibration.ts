import { randomUUID } from 'node:crypto';

import { DbEventEmitter } from '../control-plane/emitter';
import { buildInsightNode } from '../insights/insightGraph';
import { getRuntimeStore } from '../persistence/runtimeStoreProvider';

export interface CalibrationBucket {
  range: string;
  predicted: number;
  actual: number;
  count: number;
}

const BUCKETS = Array.from({ length: 10 }, (_, idx) => ({ min: idx / 10, max: (idx + 1) / 10 }));

export async function computeCalibrationMetrics(traceId: string, runId: string) {
  const store = getRuntimeStore();
  const edges = await store.listEdgeRealized();

  const brier = edges.length
    ? Number(
        (
          edges.reduce((sum, edge) => sum + (edge.modelImplied - edge.outcome) ** 2, 0) /
          edges.length
        ).toFixed(6)
      )
    : 0;

  const buckets: CalibrationBucket[] = BUCKETS.map((bucket) => {
    const items = edges.filter(
      (edge) => edge.modelImplied >= bucket.min && edge.modelImplied < bucket.max
    );
    const predicted = items.length
      ? items.reduce((sum, item) => sum + item.modelImplied, 0) / items.length
      : 0;
    const actual = items.length
      ? items.reduce((sum, item) => sum + item.outcome, 0) / items.length
      : 0;
    return {
      range: `${Math.round(bucket.min * 100)}-${Math.round(bucket.max * 100)}%`,
      predicted: Number(predicted.toFixed(4)),
      actual: Number(actual.toFixed(4)),
      count: items.length
    };
  });

  const confidenceVsAccuracy = buckets.map((bucket) => ({
    range: bucket.range,
    gap: Number((bucket.predicted - bucket.actual).toFixed(4))
  }));
  const edgeDecayRate = edges.length
    ? Number(
        (
          edges.reduce((sum, edge) => sum + Math.abs(edge.expectedValue - edge.realizedValue), 0) /
          edges.length
        ).toFixed(6)
      )
    : 0;

  const emitter = new DbEventEmitter(store);
  await emitter.emit({
    event_name: 'calibration_update',
    timestamp: new Date().toISOString(),
    request_id: randomUUID(),
    trace_id: traceId,
    run_id: runId,
    session_id: 'anon',
    user_id: null,
    agent_id: 'metrics',
    model_version: 'live-v0',
    properties: { brier_score: brier, edge_decay_rate: edgeDecayRate }
  });

  const node = buildInsightNode({
    traceId,
    runId,
    gameId: 'global',
    agentKey: 'calibration_engine',
    track: 'hybrid',
    insightType: 'calibration_update',
    claim: `Calibration updated with brier ${brier.toFixed(4)}.`,
    confidence: 0.66,
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

  return { brierScore: brier, buckets, confidenceVsAccuracy, edgeDecayRate };
}
