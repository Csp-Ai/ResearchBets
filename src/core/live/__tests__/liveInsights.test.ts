import { describe, expect, it } from 'vitest';

import { buildInsightNode } from '../../insights/insightGraph';

describe('live insight node deterministic ids', () => {
  it('creates deterministic ids for market/model/delta snapshots in same bucket', () => {
    const timestamp = '2026-01-01T00:02:00.000Z';
    const marketNode = buildInsightNode({
      traceId: 'trace_1',
      runId: 'run_1',
      gameId: 'NFL_DEMO_1',
      agentKey: 'market_loader',
      track: 'baseline',
      insightType: 'line_move',
      claim: 'market',
      confidence: 0.6,
      timestamp,
      marketImplied: 0.54
    });
    const marketNodeAgain = buildInsightNode({
      traceId: 'trace_2',
      runId: 'run_2',
      gameId: 'NFL_DEMO_1',
      agentKey: 'market_loader',
      track: 'baseline',
      insightType: 'line_move',
      claim: 'market copy',
      confidence: 0.61,
      timestamp,
      marketImplied: 0.55
    });
    const deltaNode = buildInsightNode({
      traceId: 'trace_1',
      runId: 'run_1',
      gameId: 'NFL_DEMO_1',
      agentKey: 'delta_engine',
      track: 'hybrid',
      insightType: 'market_delta',
      claim: 'delta',
      confidence: 0.63,
      timestamp,
      marketImplied: 0.52,
      modelImplied: 0.56
    });

    expect(marketNode.insight_id).toBe(marketNodeAgain.insight_id);
    expect(deltaNode.insight_id).toMatch(/^insight_/);
    expect(deltaNode.delta).toBeCloseTo(0.04, 4);
  });
});
