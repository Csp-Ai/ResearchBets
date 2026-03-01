import { beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe('/api/events GET', () => {
  it('returns an empty list with canonical trace envelope when analytics schema is unavailable', async () => {
    vi.doMock('@/src/core/persistence/runtimeStoreProvider', () => ({
      getRuntimeStore: vi.fn(() => ({
        listEvents: vi.fn(async () => {
          throw { code: '42P01', message: 'relation "events_analytics" does not exist' };
        })
      }))
    }));

    const { GET } = await import('../route');

    const response = await GET(new Request('http://localhost:3000/api/events?trace_id=t-1&limit=10'));

    expect(response.status).toBe(200);
    const payload = await response.json() as Record<string, unknown>;
    expect(payload).toEqual({ ok: true, trace_id: 't-1', events: [] });
    expect(JSON.stringify(payload)).not.toContain('traceId');
  });

  it('supports since filtering and emits snake_case only', async () => {
    vi.doMock('@/src/core/persistence/runtimeStoreProvider', () => ({
      getRuntimeStore: vi.fn(() => ({
        listEvents: vi.fn(async () => ([
          { trace_id: 't-2', event_name: 'slip_submitted', timestamp: '2026-01-01T00:00:01.000Z' },
          { trace_id: 't-2', event_name: 'run_started', timestamp: '2026-01-01T00:00:00.000Z' }
        ]))
      }))
    }));

    const { GET } = await import('../route');

    const response = await GET(new Request('http://localhost:3000/api/events?trace_id=t-2&limit=10&since=2026-01-01T00:00:00.500Z'));
    const payload = await response.json() as { events: Array<{ type: string }> };

    expect(payload).toEqual({
      ok: true,
      trace_id: 't-2',
      events: [
        {
          trace_id: 't-2',
          phase: 'BEFORE',
          type: 'slip_submitted',
          payload: { trace_id: 't-2', event_name: 'slip_submitted', timestamp: '2026-01-01T00:00:01.000Z' },
          timestamp: '2026-01-01T00:00:01.000Z'
        }
      ]
    });
    expect(JSON.stringify(payload)).not.toContain('traceId');
  });

  it('returns a 500 for non-schema errors', async () => {
    vi.doMock('@/src/core/persistence/runtimeStoreProvider', () => ({
      getRuntimeStore: vi.fn(() => ({
        listEvents: vi.fn(async () => {
          throw new Error('unexpected upstream failure');
        })
      }))
    }));

    const { GET } = await import('../route');

    const response = await GET(new Request('http://localhost:3000/api/events?trace_id=t-1&limit=10'));
    expect(response.status).toBe(500);
    const payload = await response.json() as Record<string, unknown>;
    expect(payload).toEqual({
      ok: false,
      trace_id: 't-1',
      events: [],
      error: 'Failed to list events'
    });
    expect(JSON.stringify(payload)).not.toContain('traceId');
  });
});
