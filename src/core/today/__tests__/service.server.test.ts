import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchEvents = vi.fn();
const fetchEventOdds = vi.fn();
const fetchRecentPlayerGameLogs = vi.fn();

vi.mock('@/src/core/providers/registry.server', () => ({
  getProviderRegistry: () => ({
    oddsProvider: {
      fetchEvents,
      fetchEventOdds,
    },
    statsProvider: {
      fetchRecentPlayerGameLogs,
    },
  }),
}));

describe('resolveTodayTruth', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-20T12:00:00.000Z'));
    process.env.ODDS_API_KEY = 'key';
    process.env.SPORTSDATA_API_KEY = 'key';
  });

  it('keeps live mode with provider warnings when board is viable', async () => {
    fetchEvents.mockResolvedValue({
      events: [
        { id: 'evt-1', commence_time: '2026-01-20T18:00:00.000Z', home_team: 'BOS', away_team: 'LAL' },
      ],
      fallbackReason: 'events_cache_used',
    });
    fetchEventOdds.mockResolvedValue({
      platformLines: Array.from({ length: 2 }).map((_, idx) => ({
        platform: 'book',
        player: `Player ${idx + 1}`,
        line: 20.5 + idx,
        odds: -110,
      })),
      fallbackReason: 'odds_cache_used',
    });
    fetchRecentPlayerGameLogs.mockResolvedValue({ byPlayerId: {} });

    const { resolveTodayTruth, MIN_BOARD_ROWS } = await import('../service.server');
    const payload = await resolveTodayTruth({ mode: 'live', sport: 'NBA', tz: 'UTC', date: '2026-01-20', forceRefresh: true });

    expect(payload.mode).toBe('live');
    expect(payload.landing?.mode).toBe('live');
    expect((payload.board?.length ?? 0) >= MIN_BOARD_ROWS).toBe(true);
    expect(payload.providerErrors).toEqual([]);
    expect(payload.providerWarnings).toEqual(expect.arrayContaining(['events_cache_used', 'odds_cache_used']));
    expect(payload.landing?.reason).toBe('live_ok');
  });

  it('returns demo payload for explicit demo mode without fatal provider errors', async () => {
    const { resolveTodayTruth } = await import('../service.server');
    const payload = await resolveTodayTruth({ mode: 'demo', sport: 'NBA' });

    expect(payload.mode).toBe('demo');
    expect(payload.reason).toBe('demo_requested');
    expect(payload.landing?.mode).toBe('demo');
    expect(payload.landing?.reason).toBe('demo');
    expect(payload.providerErrors).toEqual([]);
    expect(payload.providerWarnings).toContain('demo_requested');
    expect(payload.providerHealth?.find((provider) => provider.provider === 'the-odds-api')?.ok).toBe(true);
    expect(payload.providerHealth?.find((provider) => provider.provider === 'the-odds-api')?.missingKey).toBe(false);
  });

  it('falls back to demo with truthful landing reason when live board is non-viable', async () => {
    fetchEvents.mockResolvedValue({ events: [] });
    fetchEventOdds.mockResolvedValue({ platformLines: [] });
    fetchRecentPlayerGameLogs.mockResolvedValue({ byPlayerId: {} });

    const { resolveTodayTruth } = await import('../service.server');
    const payload = await resolveTodayTruth({ mode: 'live', sport: 'NBA', tz: 'UTC', date: '2026-01-20', forceRefresh: true });

    expect(payload.mode).toBe('demo');
    expect(payload.reason).toBe('provider_unavailable');
    expect(payload.landing?.mode).toBe('demo');
    expect(payload.landing?.reason).toBe('demo');
    expect(payload.providerErrors).toEqual([]);
    expect(payload.providerWarnings).toContain('provider_unavailable');
  });

  it('returns strict live empty payload when live board is not viable', async () => {
    fetchEvents.mockResolvedValue({ events: [] });
    fetchEventOdds.mockResolvedValue({ platformLines: [] });
    fetchRecentPlayerGameLogs.mockResolvedValue({ byPlayerId: {} });

    const { resolveTodayTruth } = await import('../service.server');
    const payload = await resolveTodayTruth({ mode: 'live', sport: 'NBA', tz: 'UTC', date: '2026-01-20', strictLive: true, forceRefresh: true });

    expect(payload.mode).toBe('live');
    expect(payload.reason).toBe('strict_live_empty');
    expect(payload.games).toEqual([]);
    expect(payload.board).toEqual([]);
    expect(payload.providerErrors).toEqual(['strict_live_empty']);
    expect(payload.providerWarnings).toEqual([]);
    expect(payload.landing?.reason).toBe('provider_unavailable');
  });
});
