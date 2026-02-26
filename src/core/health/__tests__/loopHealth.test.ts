import { describe, expect, it, vi } from 'vitest';

import { runLoopHealthCheck } from '@/src/core/health/loopHealth';

describe('runLoopHealthCheck', () => {
  it('passes when board and trace are returned', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ json: async () => ({ board: [{ id: 'p1' }] }) })
      .mockResolvedValueOnce({ json: async () => ({ trace_id: 'trace-1' }) });

    vi.stubGlobal('fetch', fetchMock);

    const result = await runLoopHealthCheck({ sport: 'NBA', tz: 'America/Phoenix', date: '2026-01-15', mode: 'demo' });
    expect(result.ok).toBe(true);
    expect(result.checks).toHaveLength(2);
  });
});
