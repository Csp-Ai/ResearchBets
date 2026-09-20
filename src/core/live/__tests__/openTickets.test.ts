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
  entrySnapshot: {
    capturedAt: '2026-09-13T20:05:00.000Z',
    captureSource: 'first_verified_after_tracking',
    timing: 'live',
    exactDecisionTime: false,
    legs: {
      'leg-covered': {
        capturedAt: '2026-09-13T20:05:00.000Z',
        currentValue: 35,
        elapsedGameMinutes: 12,
        quarter: 2,
        timeRemainingSec: 840,
        opportunityCount: 7,
        opportunityLabel: 'targets',
      },
    },
  },
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

  it('does not invent ladder-distance context without a verified recent median', () => {
    const leg = evaluateLiveLeg({
      legId: 'leg-no-median',
      gameId: 'ARI@LAC',
      player: 'Trey McBride',
      marketType: 'receiving_yards',
      threshold: 80,
      currentValue: 35,
      liveClock: { quarter: 2, timeRemainingSec: 420, elapsedGameMinutes: 18 }
    });

    expect(leg.reasonChips).not.toContain('Ladder distance');
  });

  it('uses structural NFL volatility tiers instead of treating every football market as stable', () => {
    const touchdown = evaluateLiveLeg({
      legId: 'leg-td',
      gameId: 'ARI@LAC',
      player: 'Trey McBride',
      marketType: 'anytime_td',
      threshold: 1,
      currentValue: 0,
      liveClock: { quarter: 2, timeRemainingSec: 420, elapsedGameMinutes: 18 }
    });
    const receiving = evaluateLiveLeg({
      legId: 'leg-rec',
      gameId: 'ARI@LAC',
      player: 'Trey McBride',
      marketType: 'receiving_yards',
      threshold: 80,
      currentValue: 35,
      liveClock: { quarter: 2, timeRemainingSec: 420, elapsedGameMinutes: 18 }
    });

    expect(touchdown.volatility).toBe('high');
    expect(receiving.volatility).toBe('moderate');
  });

  it('preserves verified opportunity health separately from production pace', () => {
    const thinUsage = evaluateLiveLeg({
      legId: 'thin-usage',
      gameId: 'SEA@ARI',
      player: 'Receiver A',
      marketType: 'receiving_yards',
      threshold: 30,
      currentValue: 0,
      opportunityCount: 0,
      opportunityLabel: 'targets',
      liveClock: { quarter: 2, timeRemainingSec: 0, elapsedGameMinutes: 24 },
    });
    const activeUsage = evaluateLiveLeg({
      legId: 'active-usage',
      gameId: 'SEA@ARI',
      player: 'Quarterback A',
      marketType: 'passing_yards',
      threshold: 200,
      currentValue: 72,
      opportunityCount: 19,
      opportunityLabel: 'pass attempts',
      liveClock: { quarter: 2, timeRemainingSec: 0, elapsedGameMinutes: 24 },
    });

    expect(thinUsage.opportunityHealth).toBe('thin');
    expect(thinUsage.reasonChips).toContain('Thin live usage');
    expect(activeUsage.opportunityHealth).toBe('active');
    expect(activeUsage.opportunityCount).toBe(19);
    expect(activeUsage.reasonChips).not.toContain('Thin live usage');
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
    expect(tickets[0]?.entrySnapshot).toMatchObject({
      timing: 'live',
      exactDecisionTime: false,
      legs: { 'leg-covered': { currentValue: 35, opportunityCount: 7 } },
    });
    expect(tickets[0]?.weakestLeg.legId).toBe('leg-covered');
    expect(tickets[0]?.coverage).toEqual({
      coverage: 'partial',
      coveredLegs: 1,
      totalLegs: 2,
    });
    expect(tickets[0]?.odds).toBe('—');
    expect(tickets[0]?.wager).toBe('—');
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
