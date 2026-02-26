import { beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe('/api/outcomes/log POST', () => {
  it('logs outcome and returns deterministic learning adjustment', async () => {
    const emit = vi.fn(async () => undefined);

    vi.doMock('@/src/core/control-plane/emitter', () => ({
      DbEventEmitter: vi.fn(() => ({ emit }))
    }));

    vi.doMock('@/src/core/supabase/server', () => ({
      getSupabaseServerClient: vi.fn(async () => ({ from: vi.fn(() => ({ insert: vi.fn(async () => ({ error: null })) })) }))
    }));

    vi.doMock('@/src/core/persistence/runtimeStoreProvider', () => ({
      getRuntimeStore: vi.fn(() => ({}))
    }));

    const { POST } = await import('../route');
    const response = await POST(new Request('http://localhost:3000/api/outcomes/log?trace_id=t-1', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ run_id: 'run-1', selection_key: 'luka_points_over_31_5', result: 'win' })
    }));

    expect(response.status).toBe(200);
    const payload = await response.json() as { ok: boolean; learning: { delta: number } };
    expect(payload.ok).toBe(true);
    expect(payload.learning.delta).toBe(0.02);
    expect(emit).toHaveBeenCalled();
  });
});
