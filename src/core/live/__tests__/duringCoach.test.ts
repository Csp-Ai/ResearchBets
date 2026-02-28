import { describe, expect, it } from 'vitest';

import { computeDuringCoach } from '@/src/core/live/duringCoach';
import type { LiveLegState, OpenTicket } from '@/src/core/live/openTickets';

function leg(overrides: Partial<LiveLegState>): LiveLegState {
  return {
    legId: 'leg',
    gameId: 'LAL@DAL',
    player: 'Player',
    marketType: 'points',
    currentValue: 10,
    threshold: 20,
    requiredRemaining: 10,
    paceProjection: 18,
    status: 'behind',
    volatility: 'moderate',
    minutesRisk: false,
    reasonChips: [],
    coverage: { coverage: 'covered' },
    liveClock: { quarter: 3, timeRemainingSec: 600, elapsedGameMinutes: 30 },
    ...overrides
  };
}

function ticket(legs: LiveLegState[], overrides?: Partial<OpenTicket>): OpenTicket {
  return {
    ticketId: 't1',
    title: 'Ticket #1',
    odds: '+400',
    wager: '$10',
    mode: 'live',
    legs,
    onPaceCount: legs.filter((item) => item.status === 'ahead' || item.status === 'on_pace').length,
    weakestLeg: legs[0],
    coverage: { coverage: 'full', coveredLegs: legs.length, totalLegs: legs.length },
    ...overrides
  };
}

describe('computeDuringCoach', () => {
  it('sorts next to hit by remaining distance then fragility', () => {
    const assist = leg({ legId: 'a', player: 'A Guard', marketType: 'assists', requiredRemaining: 1, volatility: 'high', liveClock: { quarter: 4, timeRemainingSec: 30, elapsedGameMinutes: 47.5 } });
    const point = leg({ legId: 'b', player: 'B Wing', marketType: 'points', requiredRemaining: 1, volatility: 'stable', liveClock: { quarter: 4, timeRemainingSec: 30, elapsedGameMinutes: 47.5 } });
    const result = computeDuringCoach(ticket([assist, point]));
    expect(result.nextToHit.map((item) => item.legId)).toEqual(['b', 'a']);
  });

  it('selects killRisk by highest fragility score', () => {
    const low = leg({ legId: 'a', player: 'A', marketType: 'points', requiredRemaining: 2, volatility: 'stable' });
    const high = leg({ legId: 'b', player: 'B', marketType: 'assists', requiredRemaining: 1, volatility: 'high', liveClock: { quarter: 4, timeRemainingSec: 20, elapsedGameMinutes: 47.7 } });
    const result = computeDuringCoach(ticket([low, high]));
    expect(result.killRisk.legId).toBe('b');
    expect(result.killRiskFragility.fragilityScore).toBeGreaterThanOrEqual(70);
  });

  it('fires deterministic action rules by cashout and coverage flags', () => {
    const highFragility = leg({ legId: 'a', marketType: 'assists', requiredRemaining: 1, volatility: 'high', liveClock: { quarter: 4, timeRemainingSec: 25, elapsedGameMinutes: 47.6 }, coverage: { coverage: 'missing' } });
    const steady = leg({ legId: 'b', marketType: 'points', status: 'ahead', requiredRemaining: 0, volatility: 'stable' });
    const result = computeDuringCoach(ticket([highFragility, steady], {
      cashoutAvailable: true,
      coverage: { coverage: 'partial', coveredLegs: 1, totalLegs: 2 }
    }));

    expect(result.actions.some((action) => action.kind === 'cashout')).toBe(true);
    expect(result.actions.some((action) => action.kind === 'hold')).toBe(true);
  });

  it('returns hold with not connected reason when coverage is none', () => {
    const risky = leg({ legId: 'a', marketType: 'points', requiredRemaining: 3 });
    const result = computeDuringCoach(ticket([risky], { coverage: { coverage: 'none', coveredLegs: 0, totalLegs: 1 } }));
    expect(result.actions[0]?.kind).toBe('hold');
    expect(result.explanation).toContain('hold:not_connected');
  });
});
