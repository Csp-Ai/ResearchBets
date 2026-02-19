// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { runSlip } from '@/src/core/pipeline/runSlip';
import { runStore } from '@/src/core/run/store';

describe('runSlip pipeline', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('produces a persisted run with legs and analysis', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/slips/submit')) {
        return new Response(JSON.stringify({ slip_id: '00000000-0000-0000-0000-000000000001' }), { status: 200 });
      }

      if (url.includes('/api/slips/extract')) {
        return new Response(JSON.stringify({ extracted_legs: [{ selection: 'Jayson Tatum over 29.5 points (-110)', market: 'points', odds: '-110' }] }), { status: 200 });
      }

      return new Response('{}', { status: 404 });
    });

    vi.stubGlobal('fetch', fetchMock);

    const traceId = await runSlip('Jayson Tatum over 29.5 points (-110)');
    const run = await runStore.getRun(traceId);

    expect(fetchMock).toHaveBeenCalled();
    expect(run?.status).toBe('complete');
    expect(run?.extractedLegs.length).toBe(1);
    expect(run?.enrichedLegs[0]?.l5).toBeGreaterThan(0);
    expect(run?.analysis.confidencePct).toBeGreaterThan(0);
  });
});
