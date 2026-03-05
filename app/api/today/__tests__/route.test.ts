import { beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.doMock('@/src/core/health/providerHealth.server', () => ({
    computeProviderHealth: vi.fn(async () => ({
      ok: true,
      mode: 'live',
      reason: 'live_ok',
      checks: { odds: { ok: true }, events: { ok: true }, stats: 'configured' },
      keyStatus: { requiredKeysPresent: true, liveModeEnabled: true, isProduction: false },
      providerErrors: [],
      messages: []
    }))
  }));
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


  it('defaults to live mode from provider-health when mode is omitted', async () => {
    vi.doMock('@/src/core/today/resolveToday.server', () => ({
      resolveToday: vi.fn(async ({ mode }: { mode: string }) => ({
        mode,
        generatedAt: '2026-01-15T19:30:00.000Z',
        leagues: ['NBA'],
        games: [],
        board: [],
        reason: 'live_ok',
        landing: { mode, reason: 'live_ok', gamesCount: 0, lastUpdatedAt: '2026-01-15T19:30:00.000Z' },
        provenance: { mode, reason: 'live_ok', generatedAt: '2026-01-15T19:30:00.000Z' }
      }))
    }));

    const { GET } = await import('../route');
    const response = await GET(new Request('http://localhost:3000/api/today?sport=NBA&tz=UTC&date=2026-01-20'));
    const payload = await response.json() as { data: { mode: string }, spine: { mode: string } };

    expect(payload.data.mode).toBe('live');
    expect(payload.spine.mode).toBe('live');
  });

  it('keeps explicit demo mode even when provider-health is live_ok', async () => {
    vi.doMock('@/src/core/today/resolveToday.server', () => ({
      resolveToday: vi.fn(async ({ mode }: { mode: string }) => ({
        mode: mode === 'demo' ? 'demo' : 'live',
        generatedAt: '2026-01-15T19:30:00.000Z',
        leagues: ['NBA'],
        games: [],
        board: [],
        reason: mode === 'demo' ? 'demo_requested' : 'live_ok',
        landing: { mode: mode === 'demo' ? 'demo' : 'live', reason: 'demo', gamesCount: 0, lastUpdatedAt: '2026-01-15T19:30:00.000Z' },
        provenance: { mode: mode === 'demo' ? 'demo' : 'live', reason: mode === 'demo' ? 'demo_requested' : 'live_ok', generatedAt: '2026-01-15T19:30:00.000Z' }
      }))
    }));

    const { GET } = await import('../route');
    const response = await GET(new Request('http://localhost:3000/api/today?sport=NBA&tz=UTC&date=2026-01-20&mode=demo'));
    const payload = await response.json() as { data: { mode: string }, spine: { mode: string } };

    expect(payload.data.mode).toBe('demo');
    expect(payload.spine.mode).toBe('demo');
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
        providerWarnings: ['live_unavailable:provider_events_unavailable'],
        debug: { step: 'live_viability', hint: 'provider_events_unavailable' },
        landing: { mode: 'demo', reason: 'demo', gamesCount: 0, lastUpdatedAt: '2026-01-15T19:30:00.000Z' },
        provenance: { mode: 'demo', reason: 'provider_unavailable', generatedAt: '2026-01-15T19:30:00.000Z' }
      }))
    }));

    const { GET } = await import('../route');
    const response = await GET(new Request('http://localhost:3000/api/today?sport=NBA&tz=UTC&date=2026-01-20&mode=live'));
    const payload = await response.json() as {
      data: { mode: string; providerErrors?: string[]; providerWarnings?: string[]; debug?: { step?: string } };
      landing?: { reason?: string };
      spine: { mode: string };
      debug?: { step?: string };
    };

    expect(payload.data.mode).toBe('demo');
    expect(payload.spine.mode).toBe('live');
    expect(payload.landing?.reason).toBe('demo');
    expect(payload.data.providerErrors).toEqual([]);
    expect(payload.data.providerWarnings).toContain('live_unavailable:provider_events_unavailable');
    expect(payload.data.providerWarnings?.some((warning) => warning.includes('live_hard_error:resolve_context'))).toBe(false);
    expect(payload.debug).toBeUndefined();
  });



  it('coerces ET context without resolve_context hard error warnings', async () => {
    vi.doMock('@/src/core/today/resolveToday.server', () => ({
      resolveToday: vi.fn(async () => ({
        mode: 'demo',
        generatedAt: '2026-01-15T19:30:00.000Z',
        leagues: ['NBA'],
        games: [],
        board: [],
        reason: 'provider_unavailable',
        providerErrors: [],
        providerWarnings: ['live_unavailable:provider_events_unavailable'],
        debug: { step: 'live_viability', hint: 'provider_events_unavailable' },
        landing: { mode: 'demo', reason: 'demo', gamesCount: 0, lastUpdatedAt: '2026-01-15T19:30:00.000Z' },
        provenance: { mode: 'demo', reason: 'provider_unavailable', generatedAt: '2026-01-15T19:30:00.000Z' }
      }))
    }));

    const { GET } = await import('../route');
    const response = await GET(new Request('http://localhost:3000/api/today?mode=live&sport=NBA&tz=ET'));
    const payload = await response.json() as {
      spine: { mode: string; tz: string };
      data: { providerWarnings?: string[]; mode: string };
    };

    expect(payload.spine.mode).toBe('live');
    expect(payload.spine.tz).toBe('America/New_York');
    expect(payload.data.mode).toBe('demo');
    expect(payload.data.providerWarnings).toContain('tz_invalid:ET->America/New_York');
    expect(payload.data.providerWarnings?.some((warning) => warning.includes('live_hard_error:resolve_context'))).toBe(false);
  });


  it('keeps live fallback diagnostics in live_viability stage for debug live requests', async () => {
    vi.doMock('@/src/core/today/resolveToday.server', () => ({
      resolveToday: vi.fn(async () => ({
        mode: 'demo',
        generatedAt: '2026-01-15T19:30:00.000Z',
        leagues: ['NBA'],
        games: [],
        board: [],
        reason: 'provider_unavailable',
        providerErrors: [],
        providerWarnings: ['live_unavailable:provider_events_unavailable'],
        debug: { step: 'live_viability', hint: 'provider_events_unavailable' },
        provenance: { mode: 'demo', reason: 'provider_unavailable', generatedAt: '2026-01-15T19:30:00.000Z' }
      }))
    }));

    const { GET } = await import('../route');
    const response = await GET(new Request('http://localhost:3000/api/today?mode=live&sport=NBA&debug=1'));
    const payload = await response.json() as {
      data: { providerWarnings?: string[] };
      debug?: { step?: string; hint?: string };
    };

    expect(payload.data.providerWarnings).toContain('live_unavailable:provider_events_unavailable');
    expect(payload.data.providerWarnings?.some((warning) => warning.includes('live_hard_error:resolve_context'))).toBe(false);
    expect(payload.debug?.step).toBe('live_viability');
  });



  it('keeps provider stage in debug when provider warnings carry non-error throws', async () => {
    vi.doMock('@/src/core/today/resolveToday.server', () => ({
      resolveToday: vi.fn(async () => ({
        mode: 'demo',
        generatedAt: '2026-01-15T19:30:00.000Z',
        leagues: ['NBA'],
        games: [],
        board: [],
        reason: 'provider_unavailable',
        providerErrors: [],
        providerWarnings: ['live_unavailable:non_error_throw:events_fetch'],
        debug: { step: 'resolve_context', hint: 'provider_unavailable' },
        provenance: { mode: 'demo', reason: 'provider_unavailable', generatedAt: '2026-01-15T19:30:00.000Z' }
      }))
    }));

    const { GET } = await import('../route');
    const response = await GET(new Request('http://localhost:3000/api/today?mode=live&sport=NBA&debug=1'));
    const payload = await response.json() as {
      data: { providerWarnings?: string[] };
      debug?: { step?: string; hint?: string };
    };

    expect(payload.data.providerWarnings).toContain('live_unavailable:non_error_throw:events_fetch');
    expect(payload.debug?.step).toBe('events_fetch');
    expect(payload.debug?.step).not.toBe('resolve_context');
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
        providerWarnings: ['live_hard_error:odds_fetch', 'live_hard_error_name:HttpError', 'live_hard_error_code:429'],
        debug: { step: 'odds_fetch', statusCode: 429, hint: 'rate_limited' },
        provenance: { mode: 'demo', reason: 'provider_unavailable', generatedAt: '2026-01-15T19:30:00.000Z' }
      }))
    }));

    const { GET } = await import('../route');
    const debugResponse = await GET(new Request('http://localhost:3000/api/today?sport=NBA&tz=UTC&date=2026-01-20&mode=live&debug=1'));
    const debugPayload = await debugResponse.json() as { debug?: { step: string; statusCode?: number; hint: string } };
    expect(debugPayload.debug).toEqual({ step: 'odds_fetch', statusCode: 429, hint: 'rate_limited' });
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
