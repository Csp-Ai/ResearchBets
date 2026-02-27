import { beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe('/api/today GET', () => {
  it('returns normalized response shape with live status fields', async () => {
    vi.doMock('@/src/core/today/service.server', () => ({
      getTodayPayload: vi.fn(async () => ({
        mode: 'live',
        generatedAt: '2026-01-15T19:30:00.000Z',
        leagues: ['NBA', 'NFL'],
        games: [],
        board: [],
        status: 'market_closed',
        providerHealth: [{ provider: 'the-odds-api', ok: false, message: 'timeout' }]
      }))
    }));

    const { GET } = await import('../route');
    const response = await GET(new Request('http://localhost:3000/api/today?sport=NFL&tz=UTC&date=2026-01-20'));

    expect(response.status).toBe(200);
    const payload = await response.json() as { ok: boolean; data: { mode: 'live' | 'cache' | 'demo'; status?: string; providerHealth?: Array<{ provider: string }> } };
    expect(payload.ok).toBe(true);
    expect(payload.data.mode).toBe('live');
    expect(payload.data.status).toBe('market_closed');
    expect(payload.data.providerHealth?.[0]?.provider).toBe('the-odds-api');
  });
});
