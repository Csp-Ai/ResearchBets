import { beforeEach, describe, expect, it, vi } from 'vitest';

const getBoardDataMock = vi.fn();
const emitMock = vi.fn();

vi.mock('@/src/core/board/boardService.server', () => ({
  getBoardData: getBoardDataMock
}));

vi.mock('@/src/core/control-plane/emitter', () => ({
  DbEventEmitter: class {
    emit = emitMock;
  }
}));

describe('/api/provider-health route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env.LIVE_MODE = 'true';
    process.env.ODDS_API_KEY = 'test-key';
    process.env.ODDS_API_BASE_URL = 'https://api.the-odds-api.com/v4';
  });

  it('returns canonical mode and reason from board adapter', async () => {
    getBoardDataMock.mockResolvedValue({
      mode: 'cache',
      reason: 'provider_unavailable',
      generatedAt: '2026-01-01T00:00:00.000Z',
      freshnessLabel: 'Cached live slate',
      sport: 'NBA',
      tz: 'America/Phoenix',
      dateISO: '2026-01-15',
      games: [],
      scouts: [],
      providerErrors: ['provider_timeout']
    });

    const { GET } = await import('../route');
    const response = await GET();
    const json = await response.json();

    expect(json.mode).toBe('cache');
    expect(json.reason).toBe('provider_unavailable');
    expect(json.checks.odds).toMatchObject({
      provider: 'odds',
      ok: false,
      reason: 'timeout',
      statusCode: null,
      resolvedBaseHost: 'api.the-odds-api.com',
      runtime: 'nodejs',
      errorName: 'Error',
      safeMessage: 'Odds provider request timed out'
    });
    expect(json.providerErrors).toEqual(['Odds provider request timed out']);
  });

  it('maps http status errors into reason codes without leaking secrets', async () => {
    getBoardDataMock.mockRejectedValue(new Error('Request failed with status 401 for upstream endpoint'));

    const { GET } = await import('../route');
    const response = await GET();
    const json = await response.json();

    expect(json.ok).toBe(false);
    expect(json.reason).toBe('provider_unavailable');
    expect(json.checks.odds.reason).toBe('http_401');
    expect(json.checks.odds.statusCode).toBe(401);
    expect(json.providerErrors).toEqual(['Unauthorized response from odds provider']);
  });

  it('returns bad_base_url when ODDS_API_BASE_URL is malformed', async () => {
    process.env.ODDS_API_BASE_URL = 'api.theoddsapi.com';

    const { GET } = await import('../route');
    const response = await GET();
    const json = await response.json();

    expect(getBoardDataMock).not.toHaveBeenCalled();
    expect(json.checks.odds.reason).toBe('bad_base_url');
    expect(json.checks.odds.resolvedBaseHost).toBeNull();
    expect(json.checks.odds.safeMessage).toBe('Odds provider base URL is invalid');
    expect(json.providerErrors).toEqual(['Odds provider base URL is invalid']);
  });

  it('classifies dns fetch failures via error code', async () => {
    const dnsError = Object.assign(new Error('fetch failed'), { code: 'ENOTFOUND' });
    getBoardDataMock.mockRejectedValue(dnsError);

    const { GET } = await import('../route');
    const response = await GET();
    const json = await response.json();

    expect(json.checks.odds.reason).toBe('dns');
    expect(json.checks.odds.errorName).toBe('Error');
  });

  it('classifies timeout failures via AbortError', async () => {
    const abortError = Object.assign(new Error('The operation was aborted'), { name: 'AbortError' });
    getBoardDataMock.mockRejectedValue(abortError);

    const { GET } = await import('../route');
    const response = await GET();
    const json = await response.json();

    expect(json.checks.odds.reason).toBe('timeout');
    expect(json.providerErrors).toEqual(['Odds provider request timed out']);
  });

  it('classifies tls failures via error code', async () => {
    const tlsError = Object.assign(new Error('fetch failed'), { code: 'CERT_HAS_EXPIRED', name: 'FetchError' });
    getBoardDataMock.mockRejectedValue(tlsError);

    const { GET } = await import('../route');
    const response = await GET();
    const json = await response.json();

    expect(json.checks.odds.reason).toBe('tls');
    expect(json.checks.odds.errorName).toBe('FetchError');
    expect(json.providerErrors).toEqual(['TLS handshake failed for odds provider']);
  });
});
