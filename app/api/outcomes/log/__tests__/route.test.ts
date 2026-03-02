import { beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe('/api/outcomes/log POST', () => {
  it('normalizes run_id to trace_id and keeps optional lineage metadata', async () => {
    const emit = vi.fn(async () => undefined);
    const saveSlipOutcome = vi.fn(async () => undefined);

    vi.doMock('@/src/core/control-plane/emitter', () => ({
      DbEventEmitter: vi.fn(() => ({ emit }))
    }));

    vi.doMock('@/src/core/supabase/server', () => ({
      getSupabaseServerClient: vi.fn(async () => ({ from: vi.fn(() => ({ insert: vi.fn(async () => ({ error: null })) })) }))
    }));

    vi.doMock('@/src/core/persistence/runtimeStoreProvider', () => ({
      getRuntimeStore: vi.fn(() => ({ saveSlipOutcome }))
    }));

    const { POST } = await import('../route');
    const response = await POST(new Request('http://localhost:3000/api/outcomes/log?trace_id=t-1', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        run_id: 'run-mismatch',
        selection_key: 'luka_points_over_31_5',
        result: 'win',
        ticketId: 'ticket-123',
        slip_id: 'slip-123'
      })
    }));

    expect(response.status).toBe(200);
    const payload = await response.json() as { ok: boolean; learning: { delta: number }; trace_id: string; run_id: string };
    expect(payload.ok).toBe(true);
    expect(payload.learning.delta).toBe(0.02);
    expect(payload.trace_id).toBe('t-1');
    expect(payload.run_id).toBe('t-1');

    expect(saveSlipOutcome).toHaveBeenCalledWith(expect.objectContaining({
      traceId: 't-1',
      runId: 't-1',
      ticketId: 'ticket-123',
      slipId: 'slip-123'
    }));

    expect(emit).toHaveBeenCalledWith(expect.objectContaining({
      trace_id: 't-1',
      run_id: 't-1',
      properties: expect.objectContaining({
        ticketId: 'ticket-123',
        slip_id: 'slip-123'
      })
    }));
  });
});
