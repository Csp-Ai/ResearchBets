import { describe, expect, it, vi } from 'vitest';

vi.mock('@/src/core/persistence/runtimeStoreProvider', () => ({
  getRuntimeStore: vi.fn(() => ({
    listEvents: vi.fn(async () => {
      const error = { code: '42P01', message: 'relation "events_analytics" does not exist' };
      throw error;
    })
  }))
}));

describe('/api/events GET', () => {
  it('returns an empty list when analytics schema is unavailable', async () => {
    const { GET } = await import('../route');

    const response = await GET(new Request('http://localhost:3000/api/events?trace_id=t-1&limit=10'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, events: [] });
  });
});
