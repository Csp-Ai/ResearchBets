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
    process.env.LIVE_MODE = 'true';
    process.env.ODDS_API_KEY = 'test-key';
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
    expect(json.checks.odds).toEqual({
      provider: 'odds',
      ok: false,
      reason: 'timeout',
      statusCode: null,
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
});
