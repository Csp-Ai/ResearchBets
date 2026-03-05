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



  it('labels non-Error fetchEvents throws as events_fetch live_unavailable warnings', async () => {
    fetchEvents.mockRejectedValue('network_down');

    const { resolveTodayTruth } = await import('../service.server');
    const payload = await resolveTodayTruth({ mode: 'live', sport: 'NBA', tz: 'UTC', date: '2026-01-20', forceRefresh: true });

    expect(payload.mode).toBe('demo');
    expect(payload.providerWarnings).toContain('live_unavailable:non_error_throw:events_fetch');
    expect(payload.providerWarnings?.some((warning) => warning.startsWith('live_hard_error:'))).toBe(false);
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

  it('uses cached slate on 429 odds rate limiting', async () => {
    fetchEvents.mockResolvedValue({
      events: [{ id: 'evt-1', commence_time: '2026-01-20T18:00:00.000Z', home_team: 'BOS', away_team: 'LAL' }],
    });
    fetchEventOdds.mockResolvedValue({
      platformLines: Array.from({ length: 6 }).map((_, idx) => ({ platform: 'book', player: `Player ${idx + 1}`, line: 20.5 + idx, odds: -110 })),
    });
    fetchRecentPlayerGameLogs.mockResolvedValue({ byPlayerId: {} });

    const { resolveTodayTruth } = await import('../service.server');
    await resolveTodayTruth({ mode: 'live', sport: 'NBA', tz: 'UTC', date: '2026-01-20', forceRefresh: true });

    fetchEventOdds.mockRejectedValue({ name: 'RateLimitError', status: 429 });

    const payload = await resolveTodayTruth({ mode: 'live', sport: 'NBA', tz: 'UTC', date: '2026-01-20', forceRefresh: true });
    expect(payload.mode).toBe('cache');
    expect(payload.providerWarnings).toEqual(expect.arrayContaining(['odds_rate_limited']));
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
