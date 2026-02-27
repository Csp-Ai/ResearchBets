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
    await expect(response.json()).resolves.toEqual({ ok: true, trace_id: 't-1', traceId: 't-1', events: [] });
  });

  it('returns canonical and legacy trace aliases on success', async () => {
    vi.doMock('@/src/core/persistence/runtimeStoreProvider', () => ({
      getRuntimeStore: vi.fn(() => ({
        listEvents: vi.fn(async () => ([
          { trace_id: 't-2', event_name: 'slip_submitted', timestamp: '2026-01-01T00:00:00.000Z' }
        ]))
      }))
    }));

    const { GET } = await import('../route');

    const response = await GET(new Request('http://localhost:3000/api/events?trace_id=t-2&limit=10'));
    await expect(response.json()).resolves.toEqual({
      ok: true,
      trace_id: 't-2',
      traceId: 't-2',
      events: [
        {
          trace_id: 't-2',
          phase: 'BEFORE',
          type: 'slip_submitted',
          payload: { trace_id: 't-2', event_name: 'slip_submitted', timestamp: '2026-01-01T00:00:00.000Z' },
          timestamp: '2026-01-01T00:00:00.000Z'
        }
      ]
    });
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
    await expect(response.json()).resolves.toEqual({
      ok: false,
      trace_id: 't-1',
      traceId: 't-1',
      events: [],
      error: 'Failed to list events'
    });
  });
});
