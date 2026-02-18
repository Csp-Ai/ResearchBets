import { afterEach, describe, expect, it, vi } from 'vitest';

import { runSeeLiveGamesAction } from '../liveActions';

describe('live actions', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns runUiAction envelope with ok/degraded fields', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true })
    } as Response);
    const outcome = await runSeeLiveGamesAction({ sport: 'NFL', traceId: 'trace_live_test' });
    expect(outcome.ok).toBe(true);
    expect(outcome.degraded).toBe(false);
    expect(outcome.data?.sport).toBe('NFL');
  });
});
