import { beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe('/api/today GET', () => {
  it('preserves live intent and returns live-unavailable envelope when strict live is requested and providers fail', async () => {
    vi.doMock('@/src/core/today/resolveToday.server', () => ({
      resolveToday: vi.fn(async () => {
        throw new Error('provider unavailable');
      })
    }));

    const { GET } = await import('../route');
    const response = await GET(new Request('http://localhost:3000/api/today?sport=NBA&tz=UTC&date=2026-01-20&mode=live&strict_live=1'));

    expect(response.status).toBe(200);
    const payload = await response.json() as {
      spine: { sport: string; tz: string; date: string; mode: string };
      provenance: { mode: string; reason?: string };
      board: { props: unknown[]; games: unknown[] };
    };

    expect(payload.spine).toMatchObject({ sport: 'NBA', tz: 'UTC', date: '2026-01-20' });
    expect(payload.spine.mode).toBe('live');
    expect(payload.provenance.mode).toBe('live');
    expect(payload.provenance.reason).toBe('provider_unavailable');
    expect(Array.isArray(payload.board.props)).toBe(true);
    expect(Array.isArray(payload.board.games)).toBe(true);
  });

  it('returns demo semantics for /api/today?mode=demo', async () => {
    vi.doMock('@/src/core/today/resolveToday.server', () => ({
      resolveToday: vi.fn(async () => ({
        mode: 'demo',
        generatedAt: '2026-01-15T19:30:00.000Z',
        leagues: ['NBA'],
        games: [{ id: 'g1', matchup: 'A @ B', startTime: '7:00 PM', propsPreview: [] }],
        board: [{ id: 'p1', player: 'Player 1', market: 'points', line: '22.5', odds: '-110' }],
        reason: 'demo_requested',
        providerErrors: [],
        providerWarnings: ['demo_requested'],
        providerHealth: [{ provider: 'the-odds-api', ok: true, missingKey: false }],
        landing: { mode: 'demo', reason: 'demo', gamesCount: 1, lastUpdatedAt: '2026-01-15T19:30:00.000Z' },
        provenance: { mode: 'demo', reason: 'demo_requested', generatedAt: '2026-01-15T19:30:00.000Z' }
      }))
    }));

    const { GET } = await import('../route');
    const response = await GET(new Request('http://localhost:3000/api/today?sport=NBA&tz=UTC&date=2026-01-20&mode=demo'));

    expect(response.status).toBe(200);
    const payload = await response.json() as {
      data: {
        mode: string;
        reason?: string;
        providerErrors?: string[];
        providerWarnings?: string[];
        providerHealth?: Array<{ provider: string; ok: boolean; missingKey?: boolean }>;
      };
      landing?: { mode?: string; reason?: string };
      spine: { sport: string; tz: string; date: string; mode: string };
      provenance: { mode: string; reason?: string };
      board: { props: unknown[] };
    };

    expect(payload.spine).toMatchObject({ sport: 'NBA', tz: 'UTC', date: '2026-01-20' });
    expect(payload.data.mode).toBe('demo');
    expect(payload.spine.mode).toBe('demo');
    expect(payload.provenance.mode).toBe('demo');
    expect(payload.data.reason).toBe('demo_requested');
    expect(payload.data.providerErrors).toEqual([]);
    expect(payload.data.providerWarnings).toContain('demo_requested');
    expect(payload.data.providerHealth?.find((provider) => provider.provider === 'the-odds-api')?.ok).toBe(true);
    expect(payload.landing?.mode).toBe('demo');
    expect(payload.landing?.reason).toBe('demo');
    expect(payload.board.props.length).toBeGreaterThan(0);
  });

  it('aligns spine.mode and landing.reason when /api/today?mode=live resolves to demo fallback', async () => {
    vi.doMock('@/src/core/today/resolveToday.server', () => ({
      resolveToday: vi.fn(async () => ({
        mode: 'demo',
        generatedAt: '2026-01-15T19:30:00.000Z',
        leagues: ['NBA'],
        games: [],
        board: [],
        reason: 'provider_unavailable',
        providerErrors: [],
        providerWarnings: ['provider_unavailable'],
        landing: { mode: 'demo', reason: 'demo', gamesCount: 0, lastUpdatedAt: '2026-01-15T19:30:00.000Z' },
        provenance: { mode: 'demo', reason: 'provider_unavailable', generatedAt: '2026-01-15T19:30:00.000Z' }
      }))
    }));

    const { GET } = await import('../route');
    const response = await GET(new Request('http://localhost:3000/api/today?sport=NBA&tz=UTC&date=2026-01-20&mode=live'));
    const payload = await response.json() as {
      data: { mode: string; providerErrors?: string[] };
      landing?: { reason?: string };
      spine: { mode: string };
    };

    expect(payload.data.mode).toBe('demo');
    expect(payload.spine.mode).toBe('demo');
    expect(payload.landing?.reason).toBe('demo');
    expect(payload.data.providerErrors).toEqual([]);
  });

  it('returns attempts and provenance fields from resolver payload', async () => {
    vi.doMock('@/src/core/today/resolveToday.server', () => ({
      resolveToday: vi.fn(async () => ({
        mode: 'live',
        generatedAt: '2026-01-15T19:30:00.000Z',
        leagues: ['NBA'],
        games: [{ id: 'g1', league: 'NBA', status: 'upcoming', matchup: 'A @ B', teams: ['A', 'B'], startTime: '7:00 PM', bookContext: 'ctx', propsPreview: [], provenance: 'live', lastUpdated: '2026-01-15T19:30:00.000Z' }],
        board: [{ id: 'p1', gameId: 'g1', player: 'Player 1', market: 'threes', line: '2.5', odds: '-110', attemptsSource: 'live', threesAttL5Avg: 7.2, l5Source: 'live' }],
        reason: 'live_ok',
        landing: { mode: 'live', reason: 'live_ok', gamesCount: 1, lastUpdatedAt: '2026-01-15T19:30:00.000Z' },
        provenance: { mode: 'live', reason: 'live_ok', generatedAt: '2026-01-15T19:30:00.000Z' }
      }))
    }));

    const { GET } = await import('../route');
    const response = await GET(new Request('http://localhost:3000/api/today?sport=NBA&tz=UTC&date=2026-01-20&mode=live'));
    const payload = await response.json() as {
      board: { props: Array<{ attemptsSource?: string; threesAttL5Avg?: number; l5Source?: string }> };
      landing?: { reason?: string };
      spine: { mode: string };
      data: { mode: string };
    };

    expect(payload.data.mode).toBe('live');
    expect(payload.spine.mode).toBe('live');
    expect(payload.landing?.reason).toBe('live_ok');
    expect(payload.board.props[0]?.attemptsSource).toBe('live');
    expect(payload.board.props[0]?.threesAttL5Avg).toBe(7.2);
    expect(payload.board.props[0]?.l5Source).toBe('live');
  });


  it('returns debug object only when debug=1 and keeps diagnostics sanitized', async () => {
    vi.doMock('@/src/core/today/resolveToday.server', () => ({
      resolveToday: vi.fn(async () => ({
        mode: 'demo',
        generatedAt: '2026-01-15T19:30:00.000Z',
        leagues: ['NBA'],
        games: [],
        board: [],
        reason: 'provider_unavailable',
        providerErrors: [],
        providerWarnings: ['live_hard_error:fetch_odds', 'live_hard_error_name:HttpError', 'live_hard_error_code:429'],
        debug: { step: 'fetch_odds', errorName: 'HttpError', statusCode: 429, hint: 'fetch_odds:status:429' },
        provenance: { mode: 'demo', reason: 'provider_unavailable', generatedAt: '2026-01-15T19:30:00.000Z' }
      }))
    }));

    const { GET } = await import('../route');
    const debugResponse = await GET(new Request('http://localhost:3000/api/today?sport=NBA&tz=UTC&date=2026-01-20&mode=live&debug=1'));
    const debugPayload = await debugResponse.json() as { debug?: { step: string; errorName: string; statusCode?: number; hint: string } };
    expect(debugPayload.debug).toEqual({ step: 'fetch_odds', errorName: 'HttpError', statusCode: 429, hint: 'fetch_odds:status:429' });
    expect(JSON.stringify(debugPayload.debug)).not.toContain('http');
    expect(JSON.stringify(debugPayload.debug)).not.toContain('apiKey');
    expect(JSON.stringify(debugPayload.debug)).not.toContain('stack');

    const normalResponse = await GET(new Request('http://localhost:3000/api/today?sport=NBA&tz=UTC&date=2026-01-20&mode=live'));
    const normalPayload = await normalResponse.json() as { debug?: unknown };
    expect(normalPayload.debug).toBeUndefined();
  });

  it('returns stable hard_error envelope on unhandled resolver failures', async () => {
    vi.doMock('@/src/core/today/resolveToday.server', () => ({
      resolveToday: vi.fn(async () => {
        throw new Error('boom');
      })
    }));

    const { GET } = await import('../route');
    const response = await GET(new Request('http://localhost:3000/api/today?sport=NBA&tz=UTC&date=2026-01-20&mode=live'));

    expect(response.status).toBe(200);
    const payload = await response.json() as {
      spine: { sport: string; tz: string; date: string; mode: string };
      provenance: { mode: string; reason?: string };
      board: { props: unknown[]; games: unknown[] };
    };

    expect(payload.provenance.mode).toBe('demo');
    expect(payload.provenance.reason).toBe('hard_error');
    expect(payload.spine).toMatchObject({ sport: 'NBA', tz: 'UTC', date: '2026-01-20' });
    expect(payload.spine.mode).toBe('live');
    expect(payload.board.props.length).toBeGreaterThan(0);
    expect(payload.board.games.length).toBeGreaterThan(0);
  });
});
