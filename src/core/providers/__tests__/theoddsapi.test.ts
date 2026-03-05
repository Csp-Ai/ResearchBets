import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { createTheOddsApiProvider, fetchJsonOrThrow, parsePlatformLines } from '../theoddsapi';

describe('theoddsapi provider mapping', () => {
  it('maps odds response into platform facts and consensus/divergence', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: vi.fn().mockResolvedValue(JSON.stringify([
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
      ]))
    }));

    const provider = createTheOddsApiProvider({ apiKey: 'x', baseUrl: 'https://odds' });
    const result = await provider.fetchEventOdds({ sport: 'NBA', eventIds: ['evt-1'], marketType: 'points' });

    expect(result.platformLines).toHaveLength(2);
    const consensus = provider.computeConsensus(result.platformLines);
    expect(consensus.consensusLine).toBe(26.5);
    expect(consensus.divergence.warning).toBe(true);
  });

  it('throws typed Error with status/url metadata for non-ok responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      text: vi.fn().mockResolvedValue('apiKey=super-secret denied')
    }));

    await expect(fetchJsonOrThrow('https://api.the-odds-api.com/v4/sports')).rejects.toMatchObject({
      message: 'odds_http_403',
      status: 403,
      statusCode: 403,
      url: 'https://api.the-odds-api.com/v4/sports',
      provider: 'the-odds-api',
      host: 'api.the-odds-api.com'
    });
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
