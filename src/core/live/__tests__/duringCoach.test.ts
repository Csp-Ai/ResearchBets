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
  it('sorts next to hit by remaining distance then volatility', () => {
    const one = leg({ legId: 'a', player: 'A', requiredRemaining: 2, volatility: 'high' });
    const two = leg({ legId: 'b', player: 'B', requiredRemaining: 1.5, volatility: 'moderate' });
    const three = leg({ legId: 'c', player: 'C', requiredRemaining: 2, volatility: 'stable' });

    const result = computeDuringCoach(ticket([one, two, three]));
    expect(result.nextToHit.map((item) => item.legId)).toEqual(['b', 'c']);
  });

  it('triggers cashout when minutes risk with cashout available', () => {
    const risky = leg({ legId: 'a', status: 'behind', minutesRisk: true, requiredRemaining: 4 });
    const steady = leg({ legId: 'b', status: 'on_pace', requiredRemaining: 0.5, volatility: 'stable' });
    const result = computeDuringCoach(ticket([risky, steady], { cashoutAvailable: true, cashoutValue: 14.2 }));
    expect(result.actions.some((action) => action.kind === 'cashout')).toBe(true);
  });

  it('triggers hedge when one fragile leg and rest likely', () => {
    const fragile = leg({ legId: 'a', status: 'needs_spike', volatility: 'high', requiredRemaining: 3 });
    const hit = leg({ legId: 'b', status: 'ahead', requiredRemaining: 0 });
    const near = leg({ legId: 'c', status: 'on_pace', requiredRemaining: 0.8 });

    const result = computeDuringCoach(ticket([fragile, hit, near]));
    expect(result.actions.some((action) => action.kind === 'hedge')).toBe(true);
  });

  it('returns stop sweating when ticket has busted leg', () => {
    const busted = leg({ legId: 'a', status: 'needs_spike', requiredRemaining: 3, liveClock: { quarter: 4, timeRemainingSec: 90, elapsedGameMinutes: 46.5 } });
    const other = leg({ legId: 'b', status: 'ahead', requiredRemaining: 0 });

    const result = computeDuringCoach(ticket([busted, other]));
    expect(result.actions[0]?.kind).toBe('stop_sweating');
  });
});
