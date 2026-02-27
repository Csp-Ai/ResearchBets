import { beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe('/api/metrics/calibration GET', () => {
  it('returns fallback metrics when persistence is unavailable', async () => {
    vi.doMock('@/src/core/persistence/runtimeStoreProvider', () => ({
      getRuntimeStore: vi.fn(() => ({
        listSlipOutcomes: vi.fn(async () => {
          throw new Error('missing table');
        })
      }))
    }));

    const { GET } = await import('../route');
    const response = await GET();
    const payload = await response.json() as { ok: boolean; degraded: boolean; data: { runs_analyzed: number } };

    expect(payload.ok).toBe(true);
    expect(payload.degraded).toBe(true);
    expect(payload.data.runs_analyzed).toBe(0);
  });
});
