import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchEvents = vi.fn();
const fetchEventOdds = vi.fn();
const fetchRecentPlayerGameLogs = vi.fn();

const readLastGoodToday = vi.fn();
const writeLastGoodToday = vi.fn();

vi.mock('@/src/core/today/cache.server', () => ({
  readLastGoodToday,
  writeLastGoodToday,
  getTodayCacheKey: ({ sport, tz, date }: { sport: string; tz: string; date: string }) => `today:${sport}:${tz}:${date}`,
}));

vi.mock('@/src/core/providers/registry.server', () => ({
  getProviderRegistry: () => ({
    oddsProvider: {
      id: 'odds-test',
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
    readLastGoodToday.mockResolvedValue(null);
    writeLastGoodToday.mockResolvedValue(undefined);
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


  it('uses consistent odds sport keys for events and odds calls', async () => {
    fetchEvents.mockResolvedValue({
      events: [{ id: 'evt-1', commence_time: '2026-01-20T18:00:00.000Z', home_team: 'BOS', away_team: 'LAL' }],
    });
    fetchEventOdds.mockResolvedValue({
      platformLines: Array.from({ length: 6 }).map((_, idx) => ({ platform: 'book', player: `Player ${idx + 1}`, line: 20.5 + idx, odds: -110 })),
    });
    fetchRecentPlayerGameLogs.mockResolvedValue({ byPlayerId: {} });

    const { resolveTodayTruth } = await import('../service.server');
    await resolveTodayTruth({ mode: 'live', sport: 'NBA', tz: 'UTC', date: '2026-01-20', forceRefresh: true });

    expect(fetchEvents).toHaveBeenCalledWith({ sport: 'basketball_nba' });
    expect(fetchEventOdds).toHaveBeenCalled();
    expect(fetchEventOdds.mock.calls.every(([input]) => input.sport === 'basketball_nba')).toBe(true);
  });

  it('labels fetchEvents error diagnostics as events_fetch hard errors', async () => {
    fetchEvents.mockRejectedValue(new TypeError('failed to fetch'));

    const { resolveTodayTruth } = await import('../service.server');
    const payload = await resolveTodayTruth({ mode: 'live', sport: 'NBA', tz: 'UTC', date: '2026-01-20', forceRefresh: true });

    expect(payload.mode).toBe('demo');
    expect(payload.providerWarnings).toEqual(expect.arrayContaining([
      'live_hard_error:events_fetch',
      'live_hard_error_name:TypeError',
      'live_hard_error_msg:failed to fetch',
      'live_hard_error_code:none',
    ]));
    expect(payload.debug).toMatchObject({ step: 'events_fetch', hint: 'provider_unavailable' });
    expect(payload.providerWarnings?.some((warning) => warning.includes('resolve_context'))).toBe(false);
  });



  it('normalizes non-Error fetchEvents throws into events_fetch hard-error warnings', async () => {
    fetchEvents.mockRejectedValue('network_down');

    const { resolveTodayTruth } = await import('../service.server');
    const payload = await resolveTodayTruth({ mode: 'live', sport: 'NBA', tz: 'UTC', date: '2026-01-20', forceRefresh: true });

    expect(payload.mode).toBe('demo');
    expect(payload.providerWarnings).toEqual(expect.arrayContaining([
      'live_hard_error:events_fetch',
      'live_hard_error_name:Error',
      'live_hard_error_msg:events_fetch_non_error_throw',
      'events_fetch_status:none',
      'events_fetch_provider:odds-test',
    ]));
    expect(payload.providerWarnings?.some((warning) => warning.includes('non_error_throw:events_fetch'))).toBe(false);
    expect(payload.debug).toMatchObject({ step: 'events_fetch', hint: 'provider_unavailable' });
  });

  it('returns demo with 401/403 specific warning on odds auth/plan errors', async () => {
    fetchEvents.mockResolvedValue({
      events: [{ id: 'evt-1', commence_time: '2026-01-20T18:00:00.000Z', home_team: 'BOS', away_team: 'LAL' }],
    });
    const authError = Object.assign(new Error('forbidden'), { name: 'HttpError', status: 403 });
    fetchEventOdds.mockRejectedValue(authError);

    const { resolveTodayTruth } = await import('../service.server');
    const payload = await resolveTodayTruth({ mode: 'live', sport: 'NBA', tz: 'UTC', date: '2026-01-20', forceRefresh: true });

    expect(payload.mode).toBe('demo');
    expect(payload.providerWarnings).toEqual(expect.arrayContaining([
      'odds_plan_restricted_or_key_invalid',
      'live_hard_error:odds_fetch',
      'live_hard_error_name:HttpError',
      'live_hard_error_msg:forbidden',
      'live_hard_error_code:403',
    ]));
  });





  it('classifies odds 422 as request_invalid instead of provider_unavailable', async () => {
    fetchEvents.mockResolvedValue({
      events: [{ id: 'evt-1', commence_time: '2026-01-20T18:00:00.000Z', home_team: 'BOS', away_team: 'LAL' }],
    });
    fetchEventOdds.mockRejectedValue(Object.assign(new Error('unprocessable'), { name: 'HttpError', status: 422 }));

    const { resolveTodayTruth } = await import('../service.server');
    const payload = await resolveTodayTruth({ mode: 'live', sport: 'NBA', tz: 'UTC', date: '2026-01-20', forceRefresh: true });

    expect(payload.mode).toBe('demo');
    expect(payload.reason).toBe('odds_request_invalid');
    expect(payload.providerWarnings).toEqual(expect.arrayContaining(['odds_request_invalid', 'live_hard_error:odds_fetch']));
    expect(payload.debug).toMatchObject({ step: 'odds_fetch', hint: 'request_invalid', statusCode: 422 });
    expect(payload.reason).not.toBe('provider_unavailable');
  });

  it('returns demo with events fetch diagnostics and auth warning for 401/403', async () => {
    const authError = Object.assign(new Error('forbidden'), { name: 'HttpError', status: 403, url: 'https://api.the-odds-api.com/v4/sports/basketball_nba/events?apiKey=secret' });
    fetchEvents.mockRejectedValue(authError);

    const { resolveTodayTruth } = await import('../service.server');
    const payload = await resolveTodayTruth({ mode: 'live', sport: 'NBA', tz: 'UTC', date: '2026-01-20', forceRefresh: true });

    expect(payload.mode).toBe('demo');
    expect(payload.providerWarnings).toEqual(expect.arrayContaining([
      'odds_plan_restricted_or_key_invalid',
      'live_hard_error:events_fetch',
      'events_fetch_status:403',
      'events_fetch_host:api.the-odds-api.com',
    ]));
  });

  it('classifies non-exception live fallback as live_unavailable viability warning', async () => {
    fetchEvents.mockResolvedValue({
      events: [],
    });

    const { resolveTodayTruth } = await import('../service.server');
    const payload = await resolveTodayTruth({ mode: 'live', sport: 'NBA', tz: 'UTC', date: '2026-01-20', forceRefresh: true });

    expect(payload.mode).toBe('demo');
    expect(payload.providerWarnings).toContain('live_unavailable:provider_events_unavailable');
    expect(payload.providerWarnings?.some((warning) => warning.includes('live_hard_error:resolve_context'))).toBe(false);
    expect(payload.debug).toMatchObject({ step: 'live_viability', hint: 'provider_events_unavailable' });
  });

  it('429 returns cached payload when last-good cache exists', async () => {
    fetchEvents.mockResolvedValue({
      events: [{ id: 'evt-1', commence_time: '2026-01-20T18:00:00.000Z', home_team: 'BOS', away_team: 'LAL' }],
    });
    fetchEventOdds.mockRejectedValue({ name: 'RateLimitError', status: 429 });
    readLastGoodToday.mockResolvedValue({
      savedAt: '2026-01-20T11:58:00.000Z',
      payload: {
        mode: 'live',
        generatedAt: '2026-01-20T11:58:00.000Z',
        leagues: ['NBA', 'NFL', 'MLB', 'Soccer', 'UFC', 'NHL'],
        games: [{
          id: 'evt-1',
          league: 'NBA',
          status: 'upcoming',
          startTime: 'Jan 20, 6:00 PM',
          matchup: 'LAL @ BOS',
          teams: ['LAL', 'BOS'],
          bookContext: 'cached',
          propsPreview: [],
          provenance: 'the-odds-api',
          lastUpdated: '2026-01-20T11:58:00.000Z',
        }],
        board: Array.from({ length: 6 }).map((_, idx) => ({
          id: `row-${idx + 1}`,
          gameId: 'evt-1',
          player: `Player ${idx + 1}`,
          market: 'points',
          line: '20.5',
          odds: '-110',
          hitRateL10: 60,
          marketImpliedProb: 0.52,
          modelProb: 0.56,
          edgeDelta: 0.04,
          riskTag: 'stable',
        })),
      },
    });

    const { resolveTodayTruth } = await import('../service.server');
    const payload = await resolveTodayTruth({ mode: 'live', sport: 'NBA', tz: 'UTC', date: '2026-01-20', forceRefresh: true });

    expect(payload.mode).toBe('cache');
    expect(payload.effective).toEqual({ mode: 'cache', reason: 'odds_rate_limited' });
    expect(payload.reason).toBe('odds_rate_limited');
    expect(payload.providerWarnings).toEqual(expect.arrayContaining(['live_rate_limited:odds_fetch', 'odds_rate_limited']));
    expect(payload.board?.length).toBeGreaterThan(0);
    expect(payload.games.length).toBeGreaterThan(0);
  });

  it('429 falls back to demo when cache is absent', async () => {
    fetchEvents.mockResolvedValue({
      events: [{ id: 'evt-1', commence_time: '2026-01-20T18:00:00.000Z', home_team: 'BOS', away_team: 'LAL' }],
    });
    fetchEventOdds.mockRejectedValue({ name: 'RateLimitError', status: 429 });
    readLastGoodToday.mockResolvedValue(null);

    const { resolveTodayTruth } = await import('../service.server');
    const payload = await resolveTodayTruth({ mode: 'live', sport: 'NBA', tz: 'UTC', date: '2026-01-20', forceRefresh: true });

    expect(payload.mode).toBe('demo');
    expect(payload.effective).toEqual({ mode: 'demo', reason: 'odds_rate_limited' });
    expect(payload.providerWarnings).toEqual(expect.arrayContaining(['live_rate_limited:odds_fetch', 'odds_rate_limited']));
  });

  it('live success writes last-good cache with canonical key and payload', async () => {
    fetchEvents.mockResolvedValue({
      events: [{ id: 'evt-1', commence_time: '2026-01-20T18:00:00.000Z', home_team: 'BOS', away_team: 'LAL' }],
    });
    fetchEventOdds.mockResolvedValue({
      platformLines: Array.from({ length: 6 }).map((_, idx) => ({ platform: 'book', player: `Player ${idx + 1}`, line: 20.5 + idx, odds: -110 })),
    });
    fetchRecentPlayerGameLogs.mockResolvedValue({ byPlayerId: {} });

    const { resolveTodayTruth } = await import('../service.server');
    const payload = await resolveTodayTruth({ mode: 'live', sport: 'NBA', tz: 'UTC', date: '2026-01-20', forceRefresh: true });

    expect(payload.mode).toBe('live');
    expect(writeLastGoodToday).toHaveBeenCalledTimes(1);
    expect(writeLastGoodToday).toHaveBeenCalledWith(
      { sport: 'NBA', tz: 'UTC', date: '2026-01-20' },
      expect.objectContaining({ mode: 'live', games: expect.any(Array), board: expect.any(Array) }),
    );
  });

  it('keeps live payload as stats-degraded when enrichment fails', async () => {
    fetchEvents.mockResolvedValue({
      events: [{ id: 'evt-1', commence_time: '2026-01-20T18:00:00.000Z', home_team: 'BOS', away_team: 'LAL' }],
    });
    fetchEventOdds.mockResolvedValue({
      platformLines: Array.from({ length: 6 }).map((_, idx) => ({
        platform: 'book',
        player: `Player ${idx + 1}`,
        line: 20.5 + idx,
        odds: -110,
      })),
    });
    fetchRecentPlayerGameLogs.mockRejectedValue(new Error('stats unavailable'));

    const { resolveTodayTruth } = await import('../service.server');
    const payload = await resolveTodayTruth({ mode: 'live', sport: 'NBA', tz: 'UTC', date: '2026-01-20', forceRefresh: true });

    expect(payload.mode).toBe('live');
    expect(payload.providerWarnings).toEqual(expect.arrayContaining(['stats_degraded']));
    expect(payload.board?.[0]).toMatchObject({ market: 'pra' });
  });
});
