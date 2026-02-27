import { describe, expect, it, vi } from 'vitest';

const fetchJsonWithCache = vi.fn();

vi.mock('@/src/core/sources/fetchJsonWithCache', () => ({
  fetchJsonWithCache
}));

describe('trustedContextProvider.server injuries', () => {
  it('returns empty injuries with key-missing reason', async () => {
    delete process.env.SPORTSDATA_API_KEY;
    delete process.env.TRUSTED_SPORTSDATAIO_KEY;

    const { fetchLiveInjuries } = await import('@/src/core/context/trustedContextProvider.server');
    const result = await fetchLiveInjuries({ sport: 'nba', teamIds: [], playerIds: [] });

    expect(result.items).toEqual([]);
    expect(result.fallbackReason).toContain('provider key missing');
  });

  it('returns trusted injury items from provider rows', async () => {
    process.env.SPORTSDATA_API_KEY = 'x';
    fetchJsonWithCache.mockResolvedValue({
      data: [
        { Name: 'Jayson Tatum', Team: 'BOS', InjuryStatus: 'Questionable', InjuryNotes: 'ankle', Updated: '2026-01-01T12:00:00.000Z' }
      ],
      retrievedAt: '2026-01-01T12:00:00.000Z',
      url: 'https://api.sportsdata.io/test'
    });

    const { fetchLiveInjuries } = await import('@/src/core/context/trustedContextProvider.server');
    const result = await fetchLiveInjuries({ sport: 'nba', teamIds: [], playerIds: [] });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.kind).toBe('injury');
    expect(result.fallbackReason).toBeUndefined();
  });
});
