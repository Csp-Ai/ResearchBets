import { describe, expect, it } from 'vitest';

import {
  buildOpenTickets,
  evaluateLiveLeg,
  type LiveCoverageMap,
} from '@/src/core/live/openTickets';
import type { TrackedTicket } from '@/src/core/track/types';

const trackedTicket = (): TrackedTicket => ({
  ticketId: 'ticket-live-1',
  createdAt: '2026-09-13T20:00:00.000Z',
  sourceHint: 'paste',
  rawSlipText: 'Trey McBride over 80 receiving yards',
  legs: [
    {
      legId: 'leg-covered',
      league: 'NFL',
      gameId: 'ARI @ LAC',
      player: 'Trey McBride',
      marketType: 'receiving_yards',
      threshold: 80,
      direction: 'over',
      source: 'paste',
      parseConfidence: 'high',
    },
    {
      legId: 'leg-missing',
      league: 'NFL',
      gameId: 'ARI @ LAC',
      player: 'Omarion Hampton',
      marketType: 'rushing_yards',
      threshold: 50,
      direction: 'over',
      source: 'paste',
      parseConfidence: 'high',
    },
  ],
});

describe('openTickets weakest leg reasons', () => {
  it('returns deterministic reason chips for fixed inputs', () => {
    const leg = evaluateLiveLeg({
      legId: 'leg-1',
      gameId: 'LAL@DAL',
      player: 'Player A',
      marketType: 'assists',
      threshold: 9.5,
      currentValue: 2,
      pregameSpread: 9,
      liveMargin: 19,
      recentMedian: 3,
      liveClock: { quarter: 3, timeRemainingSec: 420, elapsedGameMinutes: 30 }
    });

    expect(leg.reasonChips).toEqual(['Behind pace', 'High-variance market']);
  });

  it('keeps uncovered provider legs out of live progress and weakest-leg ranking', () => {
    const coverage: LiveCoverageMap = {
      'ticket-live-1': {
        coverage: 'partial',
        legs: {
          'leg-covered': { coverage: 'covered' },
          'leg-missing': { coverage: 'missing', reason: 'provider_unavailable' },
        },
      },
    };

    const tickets = buildOpenTickets(
      'live',
      [trackedTicket()],
      [],
      '2026-09-13T21:00:00.000Z',
      {
        'leg-covered': {
          currentValue: 74,
          elapsedGameMinutes: 30,
          quarter: 3,
          timeRemainingSec: 450,
        },
      },
      coverage,
    );

    expect(tickets).toHaveLength(1);
    expect(tickets[0]?.legs).toHaveLength(1);
    expect(tickets[0]?.legs[0]).toMatchObject({
      legId: 'leg-covered',
      currentValue: 74,
      coverage: { coverage: 'covered' },
      liveClock: { quarter: 3, timeRemainingSec: 450, elapsedGameMinutes: 30 },
    });
    expect(tickets[0]?.weakestLeg.legId).toBe('leg-covered');
    expect(tickets[0]?.coverage).toEqual({
      coverage: 'partial',
      coveredLegs: 1,
      totalLegs: 2,
    });
  });

  it('returns no live ticket instead of synthesizing progress without complete provider updates', () => {
    const noUpdates = buildOpenTickets(
      'live',
      [trackedTicket()],
      [],
      '2026-09-13T21:00:00.000Z',
      {},
    );
    expect(noUpdates).toEqual([]);

    const missingProviderClock = buildOpenTickets(
      'live',
      [trackedTicket()],
      [],
      '2026-09-13T21:00:00.000Z',
      { 'leg-covered': { currentValue: 74 } },
    );
    expect(missingProviderClock).toEqual([]);
  });
});
