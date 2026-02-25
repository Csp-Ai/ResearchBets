import { beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe('/api/today GET', () => {
  it('returns expected response shape', async () => {
    vi.doMock('@/src/core/today/service.server', () => ({
      getTodayPayload: vi.fn(async () => ({
        mode: 'demo',
        generatedAt: '2026-01-15T19:30:00.000Z',
        leagues: ['NBA', 'NFL'],
        games: [{ id: 'g1', league: 'NBA', status: 'live', startTime: 'LIVE', matchup: 'LAL @ DAL', teams: ['LAL', 'DAL'], bookContext: 'FanDuel-style', propsPreview: [], provenance: 'demo', lastUpdated: '2026-01-15T19:29:00.000Z' }]
      }))
    }));

    const { GET } = await import('../route');
    const response = await GET(new Request('http://localhost:3000/api/today'));

    expect(response.status).toBe(200);
    const payload = await response.json() as { mode: string; generatedAt: string; games: Array<{ id: string }> };
    expect(payload.mode).toBe('demo');
    expect(payload.generatedAt).toBeTypeOf('string');
    expect(Array.isArray(payload.games)).toBe(true);
    expect(payload.games[0]?.id).toBe('g1');
  });
});
