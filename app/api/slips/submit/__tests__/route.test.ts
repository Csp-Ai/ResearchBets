import { beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe('/api/slips/submit POST', () => {
  it('returns slip_id + canonical trace envelope with spine continuity', async () => {
    const createSlipSubmission = vi.fn(async () => undefined);
    const saveEvent = vi.fn(async () => undefined);

    vi.doMock('@/src/core/persistence/runtimeStoreProvider', () => ({
      getRuntimeStore: () => ({
        createSlipSubmission,
        saveEvent,
      })
    }));

    const { POST } = await import('../route');
    const response = await POST(new Request('http://localhost:3000/api/slips/submit?sport=NFL&tz=UTC&date=2026-01-20&mode=cache&trace_id=trace-in', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        anon_session_id: 'anon-1',
        source: 'paste',
        raw_text: 'Sample slip text',
        request_id: 'req-1'
      })
    }));

    expect(response.status).toBe(200);
    const payload = await response.json() as {
      ok: boolean;
      trace_id: string;
      traceId: string;
      data: {
        slip_id: string;
        trace_id: string;
        traceId: string;
        spine: { mode: string; sport: string; tz: string; date: string; trace_id?: string; slip_id?: string };
        trace: { trace_id: string; traceId: string; mode: string };
      };
    };

    expect(payload.ok).toBe(true);
    expect(payload.data.slip_id).toBeTruthy();
    expect(payload.trace_id).toBe('trace-in');
    expect(payload.traceId).toBe(payload.trace_id);
    expect(payload.data.trace_id).toBe(payload.trace_id);
    expect(payload.data.traceId).toBe(payload.trace_id);
    expect(payload.data.trace.trace_id).toBe(payload.trace_id);
    expect(payload.data.trace.traceId).toBe(payload.trace_id);
    expect(payload.data.trace.mode).toBe(payload.data.spine.mode);
    expect(payload.data.spine.sport).toBe('NFL');
    expect(payload.data.spine.tz).toBe('UTC');
    expect(payload.data.spine.date).toBe('2026-01-20');
    expect(payload.data.spine.trace_id).toBe(payload.trace_id);
    expect(payload.data.spine.slip_id).toBe(payload.data.slip_id);
  });
});
