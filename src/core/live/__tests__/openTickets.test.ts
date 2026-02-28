import { describe, expect, it } from 'vitest';

import { buildOpenTickets, computeExposureSummary, evaluateLiveLeg } from '@/src/core/live/openTickets';
import type { SlipTrackingState } from '@/src/core/slips/trackingTypes';

describe('open tickets DURING engine', () => {
  it('returns deterministic non-empty tickets in demo mode', () => {
    const tickets = buildOpenTickets('demo', [], '2026-02-28T02:00:00.000Z');
    expect(tickets.length).toBeGreaterThan(0);
    expect(tickets[0]?.title).toBe('Ticket #1');
    expect(tickets[0]?.legs.length).toBeGreaterThan(0);
  });

  it('weakest-leg now is deterministic from fixed state and time', () => {
    const state: SlipTrackingState = {
      slipId: 'slip-fixed',
      createdAtIso: '2026-02-28T00:00:00.000Z',
      mode: 'demo',
      status: 'alive',
      legs: [
        { legId: '1', gameId: 'MEM@DAL', player: 'MEM Wing A', market: 'points', line: '19.5', volatility: 'medium', outcome: 'pending', updatedAtIso: '2026-02-28T00:00:00.000Z', currentValue: 8 },
        { legId: '2', gameId: 'MEM@DAL', player: 'MEM Guard B', market: 'assists', line: '8.5', volatility: 'high', outcome: 'pending', updatedAtIso: '2026-02-28T00:00:00.000Z', currentValue: 2 },
        { legId: '3', gameId: 'MEM@DAL', player: 'MEM Big C', market: 'rebounds', line: '8.5', volatility: 'medium', outcome: 'pending', updatedAtIso: '2026-02-28T00:00:00.000Z', currentValue: 5 }
      ]
    };

    const [ticket] = buildOpenTickets('demo', [state], '2026-02-28T00:28:00.000Z');
    expect(ticket.weakestLeg.player).toBe('MEM Guard B');
    expect(ticket.weakestLeg.reasonChips.length).toBeGreaterThan(0);
  });

  it('aggregates exposure by game and player overlap', () => {
    const tickets = buildOpenTickets('demo', [], '2026-02-28T02:00:00.000Z');
    const exposure = computeExposureSummary(tickets);

    expect(exposure.byGame.some((item) => item.includes('MEM@DAL'))).toBe(true);
    expect(exposure.highVarianceLegs).toBeGreaterThan(0);
    expect(exposure.overlaps.some((item) => item.includes('in 2 tickets')) || exposure.overlaps.length === 0).toBe(true);
  });

  it('sets minutes risk chip when spread or post-halftime margin threshold is met', () => {
    const spreadRiskLeg = evaluateLiveLeg({
      legId: 'a',
      gameId: 'g1',
      player: 'Role Guard',
      marketType: 'assists',
      threshold: 6.5,
      currentValue: 2,
      pregameSpread: 8,
      liveMargin: 10,
      liveClock: { quarter: 2, timeRemainingSec: 120, elapsedGameMinutes: 22 }
    });

    const marginRiskLeg = evaluateLiveLeg({
      legId: 'b',
      gameId: 'g2',
      player: 'Bench Wing',
      marketType: 'threes',
      threshold: 2.5,
      currentValue: 1,
      pregameSpread: 4,
      liveMargin: 20,
      liveClock: { quarter: 3, timeRemainingSec: 240, elapsedGameMinutes: 30 }
    });

    expect(spreadRiskLeg.minutesRisk).toBe(true);
    expect(spreadRiskLeg.reasonChips).toContain('Minutes risk (margin)');
    expect(marginRiskLeg.minutesRisk).toBe(true);
    expect(marginRiskLeg.reasonChips).toContain('Minutes risk (margin)');
  });
});
