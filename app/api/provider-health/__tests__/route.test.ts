import { beforeEach, describe, expect, it, vi } from 'vitest';

const emitMock = vi.fn();

vi.mock('@/src/core/control-plane/emitter', () => ({
  DbEventEmitter: class {
    emit = emitMock;
  }
}));

describe('/api/provider-health route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.restoreAllMocks();
    process.env.LIVE_MODE = 'true';
    process.env.ODDS_API_KEY = 'test-key';
    process.env.ODDS_API_BASE_URL = 'https://api.the-odds-api.com/v4';
    process.env.SPORTSDATA_API_KEY = 'sports-key';
    process.env.VERCEL_ENV = 'preview';
    vi.stubEnv('NODE_ENV', 'production');
  });

  it('returns live mode when odds probe succeeds and required checks are satisfied', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/events?apiKey=')) {
        return { ok: true, status: 200, statusText: 'OK', headers: new Headers({ 'content-type': 'application/json' }), text: vi.fn().mockResolvedValue('[{"id":"evt-1","commence_time":"2026-01-20T18:00:00Z","home_team":"BOS","away_team":"LAL"}]') };
      }
      if (url.includes('/events/') && url.includes('/odds')) {
        return { ok: true, status: 200, statusText: 'OK', headers: new Headers({ 'content-type': 'application/json' }), text: vi.fn().mockResolvedValue('{"id":"evt-1","commence_time":"2026-01-20T18:00:00Z","home_team":"BOS","away_team":"LAL","bookmakers":[]}') };
      }
      return { ok: true, status: 200, statusText: 'OK', headers: new Headers({ 'content-type': 'application/json' }), text: vi.fn().mockResolvedValue('[]') };
    }));

    const { GET } = await import('../route');
    const response = await GET();
    const json = await response.json();

    expect(json.ok).toBe(true);
    expect(json.mode).toBe('live');
    expect(json.reason).toBe('live_ok');
    expect(json.providerErrors).toEqual([]);
    expect(json.providerErrors).not.toContain('Odds provider reachable');
    expect(json.messages).toEqual(['Today odds fetch shape reachable', 'Events provider reachable']);
    expect(json.checks.odds).toMatchObject({
      provider: 'odds',
      ok: true,
      reason: null,
      statusCode: 200,
      resolvedBaseHost: 'api.the-odds-api.com',
      runtime: 'nodejs',
      errorName: null,
      errorCode: null,
      safeMessage: 'Today odds fetch shape reachable'
    });
    expect(json.checks.events).toMatchObject({
      ok: true,
      reason: null,
      statusCode: 200,
      safeMessage: 'Events provider reachable'
    });

    const fetchCalls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.map(([input]) => String(input));
    const eventsCall = fetchCalls.find((url) => url.includes('/events?apiKey='));
    expect(eventsCall).toBeTruthy();
    const eventsUrl = new URL(eventsCall!);
    const oddsCall = fetchCalls.find((url) => url.includes('/events/') && url.includes('/odds?'));
    expect(oddsCall).toBeTruthy();
    expect(eventsUrl.searchParams.get('apiKey')).toBe('test-key');
    expect(eventsUrl.searchParams.has('dateFormat')).toBe(false);
    expect(eventsUrl.searchParams.has('commenceTimeFrom')).toBe(false);
    expect(json.runtimeContext).toEqual({
      vercelEnv: 'preview',
      nodeEnv: 'production',
      isVercelProd: false,
    });
  });

  it('maps http status responses into reason codes without leaking secrets', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: new Headers({ 'content-type': 'text/plain' }),
        text: vi.fn().mockResolvedValue('apiKey=test-key invalid')
      }));

    const { GET } = await import('../route');
    const response = await GET();
    const json = await response.json();

    expect(json.ok).toBe(false);
    expect(json.reason).toBe('provider_unavailable');
    expect(json.checks.odds.reason).toBe('http_401');
    expect(json.checks.odds.statusCode).toBe(401);
    expect(json.checks.odds.safeMessage).toBe('Odds provider returned HTTP 401');
    expect(json.providerErrors).toContain('Odds provider returned HTTP 401');
    expect(JSON.stringify(json)).not.toContain('test-key');
    expect(JSON.stringify(json)).not.toContain('apiKey=test-key');
  });

  it('returns bad_base_url when ODDS_API_BASE_URL is malformed', async () => {
    process.env.ODDS_API_BASE_URL = 'api.theoddsapi.com';

    const { GET } = await import('../route');
    const response = await GET();
    const json = await response.json();

    expect(json.checks.odds.reason).toBe('bad_base_url');
    expect(json.checks.odds.resolvedBaseHost).toBeNull();
    expect(json.checks.odds.safeMessage).toBe('Odds provider base URL is invalid');
    expect(json.providerErrors).toContain('Odds provider base URL is invalid');
  });

  it('classifies dns fetch failures via error code', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(Object.assign(new Error('fetch failed'), { code: 'ENOTFOUND' })));

    const { GET } = await import('../route');
    const response = await GET();
    const json = await response.json();

    expect(json.checks.odds.reason).toBe('dns');
    expect(json.checks.odds.errorCode).toBe('ENOTFOUND');
  });

  it('classifies timeout failures via AbortError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(Object.assign(new Error('The operation was aborted'), { name: 'AbortError' })));

    const { GET } = await import('../route');
    const response = await GET();
    const json = await response.json();

    expect(json.checks.odds.reason).toBe('timeout');
    expect(json.providerErrors).toContain('Odds provider request timed out');
  });

  it('classifies tls failures via error code', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(Object.assign(new Error('fetch failed'), { code: 'CERT_HAS_EXPIRED', name: 'FetchError' })));

    const { GET } = await import('../route');
    const response = await GET();
    const json = await response.json();

    expect(json.checks.odds.reason).toBe('tls');
    expect(json.checks.odds.errorName).toBe('FetchError');
    expect(json.providerErrors).toContain('TLS handshake failed for odds provider');
  });

  it('never includes success diagnostics in providerErrors when ok is true', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/events?apiKey=')) {
        return { ok: true, status: 200, statusText: 'OK', headers: new Headers({ 'content-type': 'application/json' }), text: vi.fn().mockResolvedValue('[{"id":"evt-1"}]') };
      }
      if (url.includes('/events/') && url.includes('/odds')) {
        return { ok: true, status: 200, statusText: 'OK', headers: new Headers({ 'content-type': 'application/json' }), text: vi.fn().mockResolvedValue('{"id":"evt-1","bookmakers":[]}') };
      }
      return { ok: true, status: 200, statusText: 'OK', headers: new Headers({ 'content-type': 'application/json' }), text: vi.fn().mockResolvedValue('[]') };
    }));

    const { GET } = await import('../route');
    const response = await GET();
    const json = await response.json();

    expect(json.ok).toBe(true);
    expect(json.providerErrors).toEqual([]);
    expect(json.providerErrors.some((message: string) => message.toLowerCase().includes('reachable'))).toBe(false);
  });

  it('returns provider_unavailable and request_invalid when today odds fetch returns 422', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/events/') && url.includes('/odds')) {
        return {
          ok: false,
          status: 422,
          statusText: 'Unprocessable Entity',
          headers: new Headers({ 'content-type': 'application/json' }),
          text: vi.fn().mockResolvedValue('invalid request for https://api.the-odds-api.com/v4/sports/basketball_nba/events/evt-1/odds?apiKey=test-key apiKey=test-key')
        };
      }
      if (url.includes('/events?apiKey=')) {
        return {
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: new Headers({ 'content-type': 'application/json' }),
          text: vi.fn().mockResolvedValue('[{"id":"evt-1","commence_time":"2026-01-20T18:00:00Z","home_team":"BOS","away_team":"LAL"}]')
        };
      }
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        text: vi.fn().mockResolvedValue('[]')
      };
    }));

    const { GET } = await import('../route');
    const response = await GET();
    const json = await response.json();

    expect(json.ok).toBe(false);
    expect(json.reason).toBe('provider_unavailable');
    expect(json.checks.odds.ok).toBe(false);
    expect(json.checks.odds.reason).toBe('request_invalid');
    expect(json.checks.events.ok).toBe(true);
    expect(json.checks.odds.statusCode).toBe(422);
    expect(json.providerErrors).toContain('Today odds fetch request is invalid (HTTP 422)');
    expect(JSON.stringify(json)).not.toContain('test-key');
  });
});
