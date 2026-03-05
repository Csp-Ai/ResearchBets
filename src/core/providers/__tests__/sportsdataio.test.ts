import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { createSportsDataIoProvider } from '../sportsdataio';

vi.mock('../../sources/fetchJsonWithCache', () => ({
  fetchJsonWithCache: vi.fn()
}));

import { fetchJsonWithCache } from '../../sources/fetchJsonWithCache';

describe('sportsdataio provider normalization', () => {
  it('normalizes recent logs and season averages', async () => {
    const mocked = vi.mocked(fetchJsonWithCache);
    mocked.mockResolvedValueOnce({
      data: [
        { PlayerID: 'p1', Day: '2025-01-10T00:00:00Z', OpponentID: 'opp-a', Points: 25, Rebounds: 8, Assists: 6, ThreePointersAttempted: '9', FieldGoalsAttempted: 18, UsageRate: '27.5' },
        { PlayerID: 'p1', Day: '2025-01-08T00:00:00Z', OpponentID: 'opp-b', Points: 20, Rebounds: 9, Assists: 4, '3PA': '7', FGA: '15' }
      ],
      cacheHit: false,
      retrievedAt: '2025-01-10T00:00:00Z',
      url: 'https://sportsdata/logs'
    } as never);
    mocked.mockResolvedValueOnce({
      data: [{ PlayerID: 'p1', Games: 40, AveragePoints: 24.2, AverageRebounds: 7.1, AverageAssists: 5.9 }],
      cacheHit: false,
      retrievedAt: '2025-01-10T00:00:00Z',
      url: 'https://sportsdata/season'
    } as never);

    const provider = createSportsDataIoProvider({ apiKey: 'x', baseUrl: 'https://sportsdata' });
    const logs = await provider.fetchRecentPlayerGameLogs({ sport: 'NBA', playerIds: ['p1'], limit: 5 });
    const season = await provider.fetchSeasonPlayerAverages({ sport: 'NBA', playerIds: ['p1'] });

    expect(logs.byPlayerId.p1).toHaveLength(2);
    expect(logs.byPlayerId.p1?.[0]?.stats.points).toBe(25);
    expect(logs.byPlayerId.p1?.[0]?.stats.threePointAttempts).toBe(9);
    expect(logs.byPlayerId.p1?.[0]?.stats.fieldGoalAttempts).toBe(18);
    expect(logs.byPlayerId.p1?.[0]?.stats.usageRate).toBe(27.5);
    expect(logs.byPlayerId.p1?.[1]?.stats.threePointAttempts).toBe(7);
    expect(logs.byPlayerId.p1?.[1]?.stats.fieldGoalAttempts).toBe(15);
    expect(season.byPlayerId.p1?.averages.points).toBe(24.2);
    expect(logs.provenance.sources[0]?.provider).toBe('sportsdataio');
  });
});


  it('leaves attempts undefined when source keys are missing', async () => {
    const mocked = vi.mocked(fetchJsonWithCache);
    mocked.mockResolvedValueOnce({
      data: [{ PlayerID: 'p2', Day: '2025-01-10T00:00:00Z', Points: '18' }],
      cacheHit: false,
      retrievedAt: '2025-01-10T00:00:00Z',
      url: 'https://sportsdata/logs2'
    } as never);

    const provider = createSportsDataIoProvider({ apiKey: 'x', baseUrl: 'https://sportsdata' });
    const logs = await provider.fetchRecentPlayerGameLogs({ sport: 'NBA', playerIds: ['p2'], limit: 5 });

    expect(logs.byPlayerId.p2?.[0]?.stats.threePointAttempts).toBeUndefined();
    expect(logs.byPlayerId.p2?.[0]?.stats.fieldGoalAttempts).toBeUndefined();
  });
