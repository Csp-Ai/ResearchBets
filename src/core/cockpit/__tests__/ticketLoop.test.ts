import { describe, expect, it } from 'vitest';

import { deriveLiveCommandSurface, classifyBettorLegStatus } from '@/src/core/cockpit/ticketLoop';
import type { OpenTicket } from '@/src/core/live/openTickets';
import type { PostmortemRecord } from '@/src/core/review/types';

const baseTicket: OpenTicket = {
  ticketId: 'ticket-1',
  title: 'Tracked ticket #1',
  odds: '+240',
  wager: '$20',
  mode: 'live',
  sourceHint: 'paste',
  rawSlipText: 'sample',
  createdAt: '2026-03-22T00:00:00.000Z',
  onPaceCount: 2,
  coverage: { coverage: 'full', coveredLegs: 2, totalLegs: 2 },
  weakestLeg: {
    legId: 'l2',
    gameId: 'g1',
    player: 'Aaron Gordon',
    marketType: 'rebounds',
    currentValue: 2,
    threshold: 6.5,
    requiredRemaining: 4.5,
    paceProjection: 4.8,
    status: 'behind',
    volatility: 'moderate',
    minutesRisk: false,
    reasonChips: [],
    coverage: { coverage: 'covered' },
    liveClock: { quarter: 2, timeRemainingSec: 320, elapsedGameMinutes: 18 }
  },
  legs: [
    {
      legId: 'l1',
      gameId: 'g1',
      player: 'Jamal Murray',
      marketType: 'threes',
      currentValue: 3,
      threshold: 2.5,
      requiredRemaining: 0,
      paceProjection: 6.1,
      status: 'ahead',
      volatility: 'high',
      minutesRisk: false,
      reasonChips: [],
      coverage: { coverage: 'covered' },
      liveClock: { quarter: 3, timeRemainingSec: 200, elapsedGameMinutes: 28 }
    },
    {
      legId: 'l2',
      gameId: 'g1',
      player: 'Aaron Gordon',
      marketType: 'rebounds',
      currentValue: 2,
      threshold: 6.5,
      requiredRemaining: 4.5,
      paceProjection: 4.8,
      status: 'behind',
      volatility: 'moderate',
      minutesRisk: false,
      reasonChips: [],
      coverage: { coverage: 'covered' },
      liveClock: { quarter: 2, timeRemainingSec: 320, elapsedGameMinutes: 18 }
    }
  ]
};

describe('ticketLoop', () => {
  it('classifies bettor-readable live statuses conservatively', () => {
    expect(classifyBettorLegStatus(baseTicket.legs[0]!)).toBe('cleared');
    expect(classifyBettorLegStatus(baseTicket.legs[1]!)).toBe('behind pace');
    expect(
      classifyBettorLegStatus({ ...baseTicket.legs[1]!, requiredRemaining: 1, currentValue: 5.5 })
    ).toBe('needs one event');
    expect(
      classifyBettorLegStatus({
        ...baseTicket.legs[1]!,
        status: 'needs_spike',
        requiredRemaining: 1.5
      })
    ).toBe('awaiting movement');
  });

  it('builds a live command surface with strongest leg, weakest leg, and pressure', () => {
    const surface = deriveLiveCommandSurface(baseTicket);

    expect(surface?.stage).toBe('live');
    expect(surface?.headline).toMatch(/command center/i);
    expect(surface?.strongestLeg?.player).toBe('Jamal Murray');
    expect(surface?.weakestLeg?.player).toBe('Aaron Gordon');
    expect(surface?.ticketPressure.label).toBe('Carrying well, one weak spot remains');
    expect(surface?.attention).toMatch(/Strongest leg/i);
    expect(surface?.legs.map((leg) => leg.status)).toEqual(
      expect.arrayContaining(['cleared', 'behind pace'])
    );
  });

  it('falls back to after-state handoff copy when only a postmortem exists', () => {
    const postmortem: PostmortemRecord = {
      ticketId: 'ticket-1',
      trace_id: 'trace-1',
      slip_id: 'slip-1',
      createdAt: '2026-03-22T00:00:00.000Z',
      settledAt: '2026-03-22T03:00:00.000Z',
      status: 'lost',
      cashoutTaken: undefined,
      legs: [],
      coverage: { level: 'full', reasons: [] },
      fragility: { score: 68, chips: ['High-variance market'] },
      narrative: [
        'Ticket settled lost.',
        'Aaron Gordon was the biggest swing (-2.5 vs line).',
        'Coverage held across all legs.'
      ],
      coachSnapshot: undefined,
      nextTimeRule: undefined
    };

    const surface = deriveLiveCommandSurface(null, postmortem);
    expect(surface?.stage).toBe('after');
    expect(surface?.attention).toMatch(/biggest swing/i);
    expect(surface?.recommendation).toMatch(/postmortem/i);
  });
});
