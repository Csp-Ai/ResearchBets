import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { createTheOddsApiProvider, parsePlatformLines } from '../theoddsapi';

vi.mock('../../sources/fetchJsonWithCache', () => ({
  fetchJsonWithCache: vi.fn()
}));

import { fetchJsonWithCache } from '../../sources/fetchJsonWithCache';

describe('theoddsapi provider mapping', () => {
  it('maps odds response into platform facts and consensus/divergence', async () => {
    const rows = [
      {
        id: 'evt-1',
        commence_time: '2025-01-10T00:00:00Z',
        home_team: 'LAL',
        away_team: 'BOS',
        bookmakers: [
          {
            key: 'fanduel',
            title: 'FanDuel',
            markets: [{ key: 'player_points', outcomes: [{ name: 'LeBron James', point: 25.5, price: -110 }] }]
          },
          {
            key: 'draftkings',
            title: 'DraftKings',
            markets: [{ key: 'player_points', outcomes: [{ name: 'LeBron James', point: 27.5, price: -105 }] }]
          }
        ]
      }
    ];

    const mocked = vi.mocked(fetchJsonWithCache);
    mocked.mockResolvedValue({ data: rows, cacheHit: false, retrievedAt: '2025-01-10T00:00:00Z', url: 'https://odds' } as never);

    const provider = createTheOddsApiProvider({ apiKey: 'x', baseUrl: 'https://odds' });
    const result = await provider.fetchEventOdds({ sport: 'NBA', eventIds: ['evt-1'], marketType: 'points' });

    expect(result.platformLines).toHaveLength(2);
    const consensus = provider.computeConsensus(result.platformLines);
    expect(consensus.consensusLine).toBe(26.5);
    expect(consensus.divergence.warning).toBe(true);
  });

  it('parses platform lines directly', () => {
    const lines = parsePlatformLines({
      marketType: 'points',
      events: [{ id: 'e', commence_time: '2025-01-10T00:00:00Z', home_team: 'A', away_team: 'B', bookmakers: [{ key: 'fanduel', title: 'FD', markets: [{ key: 'player_points', outcomes: [{ name: 'P', point: 21.5 }] }] }] }]
    });
    expect(lines[0]?.platform).toBe('fanduel');
    expect(lines[0]?.marketType).toBe('points');
  });
});
