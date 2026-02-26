import { beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe('/api/slips/submit POST', () => {
  it('returns slip_id + trace envelope with spine continuity', async () => {
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
      slip_id: string;
      trace_id: string;
      spine: { mode: string; sport: string; tz: string; date: string; trace_id?: string; slip_id?: string };
      trace: { trace_id: string; mode: string };
    };

    expect(payload.slip_id).toBeTruthy();
    expect(payload.trace_id).toBe('trace-in');
    expect(payload.trace.trace_id).toBe(payload.trace_id);
    expect(payload.trace.mode).toBe(payload.spine.mode);
    expect(payload.spine.sport).toBe('NFL');
    expect(payload.spine.tz).toBe('UTC');
    expect(payload.spine.date).toBe('2026-01-20');
    expect(payload.spine.trace_id).toBe(payload.trace_id);
    expect(payload.spine.slip_id).toBe(payload.slip_id);
  });
});
