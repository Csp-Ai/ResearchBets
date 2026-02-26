import { beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe('/api/slips/recent GET', () => {
  it('includes trace_id and consistent optional spine/trace envelope', async () => {
    vi.doMock('@/src/core/persistence/runtimeStoreProvider', () => ({
      getRuntimeStore: () => ({
        listSlipSubmissions: vi.fn(async () => ([{
          id: 'slip-1',
          rawText: 'J. Carter points 24.5 -110',
          parseStatus: 'received',
          traceId: 'trace-1',
          createdAt: '2026-01-20T10:00:00.000Z',
          anonSessionId: 'anon-1'
        }]))
      })
    }));

    const { GET } = await import('../route');
    const response = await GET(new Request('http://localhost:3000/api/slips/recent?sport=NBA&tz=America/Phoenix&date=2026-01-20&mode=demo'));
    expect(response.status).toBe(200);

    const payload = await response.json() as { slips: Array<{ trace_id: string; spine?: { mode: string }; trace?: { trace_id: string; mode: string } }> };
    const first = payload.slips[0];
    expect(first?.trace_id).toBe('trace-1');
    expect(first?.spine).toBeDefined();
    expect(first?.trace).toBeDefined();
    if (first?.spine && first.trace) {
      expect(first.trace.trace_id).toBe(first.trace_id);
      expect(first.trace.mode).toBe(first.spine.mode);
    }
  });
});
