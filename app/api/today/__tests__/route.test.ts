import { beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe('/api/today GET', () => {
  it('degrades to demo/cache envelope with spine + provenance and non-empty board', async () => {
    vi.doMock('@/src/core/today/resolveToday.server', () => ({
      resolveToday: vi.fn(async () => ({
        mode: 'demo',
        generatedAt: '2026-01-15T19:30:00.000Z',
        leagues: ['NBA'],
        games: [{ id: 'g1', matchup: 'A @ B', startTime: '7:00 PM', propsPreview: [] }],
        board: [{ id: 'p1', player: 'Player 1', market: 'points', line: '22.5', odds: '-110' }],
        reason: 'provider_unavailable',
        provenance: { mode: 'demo', reason: 'provider_unavailable', generatedAt: '2026-01-15T19:30:00.000Z' }
      }))
    }));

    const { GET } = await import('../route');
    const response = await GET(new Request('http://localhost:3000/api/today?sport=NBA&tz=UTC&date=2026-01-20&mode=live'));

    expect(response.status).toBe(200);
    const payload = await response.json() as { provenance: { mode: 'cache' | 'demo' | 'live' }; spine: { sport: string; tz: string; date: string }; board: { props: unknown[] } };
    expect(payload.provenance.mode).toMatch(/cache|demo/);
    expect(payload.spine).toMatchObject({ sport: 'NBA', tz: 'UTC', date: '2026-01-20' });
    expect(Array.isArray(payload.board.props)).toBe(true);
    expect(payload.board.props.length).toBeGreaterThan(0);
  });
});
