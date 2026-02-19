import { beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe('/api/events GET', () => {
  it('returns an empty list when analytics schema is unavailable', async () => {
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
    await expect(response.json()).resolves.toEqual({ ok: true, events: [] });
  });

  it('rethrows non-schema errors', async () => {
    vi.doMock('@/src/core/persistence/runtimeStoreProvider', () => ({
      getRuntimeStore: vi.fn(() => ({
        listEvents: vi.fn(async () => {
          throw new Error('unexpected upstream failure');
        })
      }))
    }));

    const { GET } = await import('../route');

    await expect(GET(new Request('http://localhost:3000/api/events?trace_id=t-1&limit=10'))).rejects.toThrow(
      'unexpected upstream failure'
    );
  });
});
