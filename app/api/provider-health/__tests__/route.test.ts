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
  });

  it('returns live mode when odds probe succeeds and required checks are satisfied', async () => {
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
    const response = await GET();
    const json = await response.json();

    expect(json.ok).toBe(true);
    expect(json.mode).toBe('live');
    expect(json.reason).toBe('live_ok');
    expect(json.providerErrors).toEqual([]);
    expect(json.providerErrors).not.toContain('Odds provider reachable');
    expect(json.messages).toEqual(['Odds provider reachable']);
    expect(json.checks.odds).toMatchObject({
      provider: 'odds',
      ok: true,
      reason: null,
      statusCode: 200,
      resolvedBaseHost: 'api.the-odds-api.com',
      runtime: 'nodejs',
      errorName: null,
      errorCode: null,
      safeMessage: 'Odds provider reachable'
    });
  });

  it('maps http status responses into reason codes without leaking secrets', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: new Headers({ 'content-type': 'text/plain' }),
        text: vi.fn().mockResolvedValue('apiKey=test-key invalid')
      })
    );

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
    const response = await GET();
    const json = await response.json();

    expect(json.ok).toBe(true);
    expect(json.providerErrors).toEqual([]);
    expect(json.providerErrors.some((message: string) => message.toLowerCase().includes('reachable'))).toBe(false);
  });
});
