import { describe, expect, it } from 'vitest';

import { consolidateAgentProgress } from '../src/core/agents/progress';

describe('consolidateAgentProgress', () => {
  it('caps progress at 100 and waits for both tracks', () => {
    const rows = consolidateAgentProgress([
      { agentKey: 'the_doc_baseline', track: 'baseline', progress: 140, status: 'completed', finalVerdict: 'lean_under' },
      { agentKey: 'the_doc_hybrid', track: 'hybrid', progress: 100, status: 'completed' },
    ], ['the_doc'], true);

    expect(rows[0]?.progress).toBeLessThanOrEqual(100);
    expect(rows[0]?.status).toEqual('completed');
    expect(rows[0]?.finalVerdict).toBeTruthy();
  });
});
