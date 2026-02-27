import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockedFetchEvents = vi.fn();

vi.mock('@/src/core/providers/registry.server', () => ({
  getProviderRegistry: () => ({
    oddsProvider: {
      fetchEvents: mockedFetchEvents
    }
  })
}));

describe('market snapshot demo provider', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    mockedFetchEvents.mockReset();
    delete process.env.LIVE_MARKETS_WEB_PROVIDER_ENABLED;
    delete process.env.ODDS_API_KEY;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns deterministic game ids and source tags', async () => {
    const { getMarketSnapshot } = await import('../marketData');
    const snapshot = await getMarketSnapshot({ sport: 'NFL' });
    expect(snapshot.source).toBe('DEMO');
    expect(snapshot.games[0]?.gameId).toBe('NFL_DEMO_1');
    expect(
      snapshot.games.every((game) => ['DEMO', 'derived', 'scraped'].includes(game.source))
    ).toBe(true);
  });

  it('computes freshness metadata for miss and hit responses', async () => {
    const { getMarketSnapshot } = await import('../marketData');
    const first = await getMarketSnapshot({ sport: 'NHL' });
    expect(first.cache_status).toBe('miss');
    expect(first.age_ms).toBe(0);
    expect(first.as_of_iso).toBe('2026-01-01T00:00:00.000Z');

    vi.advanceTimersByTime(1_500);

    const second = await getMarketSnapshot({ sport: 'NHL' });
    expect(second.cache_status).toBe('hit');
    expect(second.age_ms).toBe(1_500);
    expect(second.as_of_iso).toBe(first.as_of_iso);
  });

  it('returns null-equivalent live snapshot fallback when web flag is off', async () => {
    const { getMarketSnapshot } = await import('../marketData');
    const snapshot = await getMarketSnapshot({ sport: 'NBA' });
    expect(snapshot.source).toBe('DEMO');
    expect(snapshot.provenance).toBeUndefined();
  });

  it('returns demo fallback provenance when web flag is on and key is missing', async () => {
    process.env.LIVE_MARKETS_WEB_PROVIDER_ENABLED = 'true';
    const { getMarketSnapshot } = await import('../marketData');
    const snapshot = await getMarketSnapshot({ sport: 'NBA', dateRange: { start: '2026-01-01' } });
    expect(snapshot.provenance?.reason).toBe('odds_api_key_missing');
    expect(snapshot.provenance?.source).toBe('demo');
  });

  it('returns non-null live snapshot when web flag is on and provider responds', async () => {
    process.env.LIVE_MARKETS_WEB_PROVIDER_ENABLED = 'true';
    process.env.ODDS_API_KEY = 'test-key';
    mockedFetchEvents.mockResolvedValue({
      events: [
        {
          id: 'evt-1',
          commence_time: '2026-01-01T02:00:00.000Z',
          home_team: 'BOS',
          away_team: 'LAL'
        }
      ]
    });
    const { getMarketSnapshot } = await import('../marketData');
    const snapshot = await getMarketSnapshot({ sport: 'NBA', dateRange: { start: '2026-01-02' } });
    expect(snapshot.games).toHaveLength(1);
    expect(snapshot.games[0]?.source).toBe('scraped');
    expect(snapshot.provenance?.source).toBe('live_web');
  });
});
