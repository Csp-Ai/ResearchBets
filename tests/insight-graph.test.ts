import { describe, expect, it } from 'vitest';

import { createInsightId } from '../src/core/insights/insightGraph';

describe('insight id determinism', () => {
  it('uses same deterministic id within timestamp bucket', () => {
    const first = createInsightId({ gameId: 'NFL_DEMO_1', agentKey: 'the_doc', insightType: 'injury', timestamp: '2026-01-01T00:00:01.000Z' });
    const second = createInsightId({ gameId: 'NFL_DEMO_1', agentKey: 'the_doc', insightType: 'injury', timestamp: '2026-01-01T00:04:59.000Z' });
    expect(first).toEqual(second);
  });
});
