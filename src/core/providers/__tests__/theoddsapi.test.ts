import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  buildEventOddsUrl,
  createTheOddsApiProvider,
  fetchJsonOrThrow,
  marketToOddsApi,
  parsePlatformLines
} from '../theoddsapi';

describe('theoddsapi provider mapping', () => {
  it('maps odds response into platform facts and consensus/divergence', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: vi.fn().mockResolvedValue(JSON.stringify({
        id: 'evt-1',
        commence_time: '2025-01-10T00:00:00Z',
        home_team: 'LAL',
        away_team: 'BOS',
        bookmakers: [
          {
            key: 'fanduel',
            title: 'FanDuel',
            markets: [{ key: 'player_points', outcomes: [{ name: 'Over', description: 'LeBron James', point: 25.5, price: -110 }] }]
          },
          {
            key: 'draftkings',
            title: 'DraftKings',
            markets: [{ key: 'player_points', outcomes: [{ name: 'Over', description: 'LeBron James', point: 27.5, price: -105 }] }]
          }
        ]
      }))
    }));

    const provider = createTheOddsApiProvider({ apiKey: 'x', baseUrl: 'https://odds' });
    const result = await provider.fetchEventOdds({ sport: 'NBA', eventIds: ['evt-1'], marketType: 'points' });

    expect(result.platformLines).toHaveLength(2);
    expect(result.platformLines[0]?.player).toBe('LeBron James');
    const consensus = provider.computeConsensus(result.platformLines);
    expect(consensus.consensusLine).toBe(26.5);
    expect(consensus.divergence.warning).toBe(true);
  });

  it('maps canonical NFL props to documented Odds API market keys', () => {
    expect(marketToOddsApi('passing_yards')).toBe('player_pass_yds');
    expect(marketToOddsApi('passing_tds')).toBe('player_pass_tds');
    expect(marketToOddsApi('rushing_yards')).toBe('player_rush_yds');
    expect(marketToOddsApi('receiving_yards')).toBe('player_reception_yds');
    expect(marketToOddsApi('receptions')).toBe('player_receptions');
    expect(marketToOddsApi('carries')).toBe('player_rush_attempts');
    expect(marketToOddsApi('anytime_td')).toBe('player_anytime_td');
  });

  it('parses NFL over/under player descriptions into canonical platform lines', () => {
    const lines = parsePlatformLines({
      marketType: 'rushing_yards',
      events: [{
        id: 'nfl-1',
        commence_time: '2026-09-13T20:25:00Z',
        home_team: 'PHI',
        away_team: 'WAS',
        bookmakers: [{
          key: 'fanduel',
          title: 'FanDuel',
          markets: [{
            key: 'player_rush_yds',
            outcomes: [
              { name: 'Over', description: 'Saquon Barkley', point: 74.5, price: -110 },
              { name: 'Under', description: 'Saquon Barkley', point: 74.5, price: -120 }
            ]
          }]
        }]
      }]
    });

    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatchObject({
      platform: 'fanduel',
      marketType: 'rushing_yards',
      player: 'Saquon Barkley',
      line: 74.5
    });
  });

  it('normalizes affirmative anytime touchdown outcomes to a 1-touchdown line', () => {
    const lines = parsePlatformLines({
      marketType: 'anytime_td',
      events: [{
        id: 'nfl-2',
        commence_time: '2026-09-13T20:25:00Z',
        home_team: 'MIN',
        away_team: 'GB',
        bookmakers: [{
          key: 'draftkings',
          title: 'DraftKings',
          markets: [{
            key: 'player_anytime_td',
            outcomes: [
              { name: 'Yes', description: 'Justin Jefferson', price: 145 },
              { name: 'No', description: 'Justin Jefferson', price: -180 }
            ]
          }]
        }]
      }]
    });

    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({
      player: 'Justin Jefferson',
      marketType: 'anytime_td',
      line: 1,
      odds: 145
    });
  });

  it('builds today odds event endpoint with canonical query keys', () => {
    const url = new URL(buildEventOddsUrl({
      baseUrl: 'https://api.the-odds-api.com/v4',
      sport: 'NBA',
      eventId: 'evt-1',
      apiKey: 'secret',
      market: 'player_points'
    }));

    expect(url.pathname).toBe('/v4/sports/basketball_nba/events/evt-1/odds');
    expect([...url.searchParams.keys()].sort()).toEqual(['apiKey', 'dateFormat', 'markets', 'oddsFormat', 'regions']);
    expect(url.searchParams.get('markets')).toBe('player_points');
  });

  it('builds NFL event URLs using the NFL sport key', () => {
    const url = new URL(buildEventOddsUrl({
      baseUrl: 'https://api.the-odds-api.com/v4',
      sport: 'NFL',
      eventId: 'nfl-evt',
      apiKey: 'secret',
      market: 'player_rush_yds'
    }));

    expect(url.pathname).toBe('/v4/sports/americanfootball_nfl/events/nfl-evt/odds');
    expect(url.searchParams.get('markets')).toBe('player_rush_yds');
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
