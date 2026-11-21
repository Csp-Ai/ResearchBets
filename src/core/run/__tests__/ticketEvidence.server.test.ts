import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fetchEvents, fetchInjuries, fetchHistory } = vi.hoisted(() => ({
  fetchEvents: vi.fn(),
  fetchInjuries: vi.fn(),
  fetchHistory: vi.fn()
}));

vi.mock('@/src/core/providers/registry.server', () => ({
  getProviderRegistry: () => ({ oddsProvider: { id: 'the-odds-api', fetchEvents } })
}));
vi.mock('@/src/core/context/trustedContextProvider.server', () => ({ fetchLiveInjuries: fetchInjuries }));
vi.mock('@/src/core/providers/sportsdataio', () => ({ fetchNbaResearchHistory: fetchHistory }));

import { fetchTicketEvidence } from '../ticketEvidence.server';

describe('reviewed ticket evidence', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    fetchInjuries.mockResolvedValue({ items: [] });
    fetchHistory.mockResolvedValue(new Map());
    fetchEvents.mockResolvedValue({
      events: [{ id: '1', away_team: 'Away Team', home_team: 'Home Team', commence_time: '2026-11-21T23:00:00Z' }],
      provenance: {
        sources: [{
          provider: 'the-odds-api',
          url: 'https://example.com/events?apiKey=server-secret',
          retrievedAt: '2026-11-21T12:00:00Z'
        }]
      }
    });
  });

  it('returns a candidate schedule listing and cached historical values without leaking provider URLs', async () => {
    fetchHistory.mockResolvedValue(new Map([['example player', {
      cacheHit: true,
      retrievedAt: '2026-11-21T11:00:00Z',
      logs: [
        { gameDate: '2026-11-20', stats: { points: 18, rebounds: 6, assists: 5 } },
        { gameDate: '2026-11-16', stats: { points: 21, rebounds: 7 } }
      ]
    }]]));
    const result = await fetchTicketEvidence({ legs: [
      { id: 'leg-a', league: 'NBA', player: 'Example Player', market: 'pra', matchup: 'Away Team at Home Team' }
    ] });

    expect(fetchEvents).toHaveBeenCalledWith({ sport: 'NBA', fresh: true });
    expect(result.byLegId['leg-a']).toMatchObject({
      event: {
        matchup: 'Away Team at Home Team',
        source: 'The Odds API',
        freshness: 'current provider listing',
        retrievedAt: '2026-11-21T12:00:00Z'
      },
      history: {
        games: [{ date: '2026-11-20', value: 29 }],
        source: 'SportsDataIO', freshness: 'cached historical'
      }
    });
    expect(JSON.stringify(result)).not.toContain('server-secret');
  });

  it('keeps unmatched teams and provider failures unavailable', async () => {
    fetchEvents.mockRejectedValue(new Error('unreachable'));

    const result = await fetchTicketEvidence({ legs: [
      { id: 'nba', league: 'NBA', player: 'Example', market: 'moneyline', matchup: 'Unknown Team at Home Team' },
      { id: 'college', league: 'NCAAB', player: 'Example', market: 'points' }
    ] });

    expect(JSON.stringify(result)).toEqual('{"byLegId":{"nba":{}}}');
    expect(fetchHistory).not.toHaveBeenCalled();
    expect(fetchInjuries).not.toHaveBeenCalled();
  });
});
