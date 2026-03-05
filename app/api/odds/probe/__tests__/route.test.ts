import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('/api/odds/probe route', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    process.env.ODDS_API_KEY = 'super-secret-key';
    process.env.ODDS_API_BASE_URL = 'https://api.the-odds-api.com/v4';
  });

  it('probes today odds_fetch shape by default', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: new Headers({ 'content-type': 'application/json' }),
          text: vi.fn().mockResolvedValue('[{"id":"evt-1","commence_time":"2026-01-20T18:00:00Z","home_team":"BOS","away_team":"LAL"}]')
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: new Headers({ 'content-type': 'application/json' }),
          text: vi.fn().mockResolvedValue('{"id":"evt-1","commence_time":"2026-01-20T18:00:00Z","home_team":"BOS","away_team":"LAL","bookmakers":[]}')
        })
    );

    const { GET } = await import('../route');
    const response = await GET(new Request('http://localhost:3000/api/odds/probe'));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      ok: true,
      runtime: 'nodejs',
      target: 'today_odds_fetch',
      urlPath: '/v4/sports/basketball_nba/events/{eventId}/odds',
      queryKeys: ['apiKey', 'regions', 'markets', 'oddsFormat', 'dateFormat'],
      status: 200,
    });

    const fetchCalls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.map(([input]) => String(input));
    expect(fetchCalls[0]).toContain('/v4/sports/basketball_nba/events?apiKey=super-secret-key');
    expect(fetchCalls[1]).toContain('/v4/sports/basketball_nba/events/evt-1/odds?');
    expect(fetchCalls[1]).toContain('markets=player_points');
    expect(fetchCalls[1]).toContain('regions=us');
    expect(fetchCalls[1]).toContain('oddsFormat=american');
    expect(fetchCalls[1]).toContain('dateFormat=iso');
    expect(JSON.stringify(payload)).not.toContain('super-secret-key');
  });

  it('returns sanitized snippet for invalid today request responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: new Headers({ 'content-type': 'application/json' }),
          text: vi.fn().mockResolvedValue('[{"id":"evt-1","commence_time":"2026-01-20T18:00:00Z","home_team":"BOS","away_team":"LAL"}]')
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 422,
          statusText: 'Unprocessable Entity',
          headers: new Headers({ 'content-type': 'text/plain' }),
          text: vi.fn().mockResolvedValue('422 apiKey=super-secret-key invalid request')
        })
    );

    const { GET } = await import('../route');
    const response = await GET(new Request('http://localhost:3000/api/odds/probe'));
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.reason).toBe('request_invalid');
    expect(payload.bodySnippet).toContain('apiKey=[redacted]');
    expect(payload.bodySnippet).not.toContain('super-secret-key');
  });

  it('supports sports_list target for reachability-only checks', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        text: vi.fn().mockResolvedValue('[]')
      })
    );

    const { GET } = await import('../route');
    const response = await GET(new Request('http://localhost:3000/api/odds/probe?target=sports_list'));
    const payload = await response.json();

    expect(payload.target).toBe('sports_list');
    expect(payload.urlPath).toBe('/v4/sports');
    expect(payload.queryKeys).toEqual(['apiKey']);
  });
});
