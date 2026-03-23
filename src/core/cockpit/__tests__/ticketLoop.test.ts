import { describe, expect, it } from 'vitest';

import {
  deriveAfterCommandSurface,
  deriveLiveCommandSurface,
  classifyBettorLegStatus
} from '@/src/core/cockpit/ticketLoop';
import type { OpenTicket } from '@/src/core/live/openTickets';
import type { PostmortemRecord } from '@/src/core/review/types';
import type { SlipTrackingState } from '@/src/core/slips/trackingTypes';

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

const settledPostmortem: PostmortemRecord = {
  ticketId: 'ticket-1',
  trace_id: 'trace-1',
  slip_id: 'slip-1',
  createdAt: '2026-03-22T00:00:00.000Z',
  settledAt: '2026-03-22T03:00:00.000Z',
  status: 'lost',
  cashoutTaken: undefined,
  legs: [
    {
      legId: 'l1',
      player: 'Jamal Murray',
      statType: 'threes',
      target: 2.5,
      finalValue: 5,
      delta: 2.5,
      hit: true,
      missTags: [],
      missNarrative: 'Leg cleared the target.',
      lessonHint: 'Keep process stable.'
    },
    {
      legId: 'l2',
      player: 'Aaron Gordon',
      statType: 'rebounds',
      target: 6.5,
      finalValue: 6,
      delta: -0.5,
      hit: false,
      missTags: ['bust_by_one'],
      missNarrative: 'Missed by half a rebound and broke the close.',
      lessonHint: 'Shave the line before stacking another rebound ladder.'
    }
  ],
  coverage: { level: 'full', reasons: [] },
  fragility: { score: 68, chips: ['High-variance market'] },
  narrative: [
    'Ticket settled lost.',
    'Aaron Gordon was the biggest swing (-0.5 vs line).',
    'Coverage held across all legs.'
  ],
  coachSnapshot: undefined,
  nextTimeRule: undefined
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
    expect(surface?.ticketPressure.label).toBe('One-leg fragile');
    expect(surface?.lifecycleRisk.primaryDriver).toBe('correlated_stack_pressure');
    expect(surface?.actionGuidance.action_label).toMatch(/monitor closely/i);
    expect(surface?.actionEvidence.primary_evidence.label).toMatch(/correlated scoring dependency/i);
    expect(surface?.ticketThesis.headline).toMatch(/under pressure live|holding live/i);
    expect(surface?.ticketThesis.continuity_read).toMatch(/Jamal Murray|Aaron Gordon/i);
    expect(surface?.attention).toMatch(/Strongest leg/i);
    expect(surface?.legs.map((leg) => leg.status)).toEqual(
      expect.arrayContaining(['cleared', 'behind pace'])
    );
  });

  it('derives a deterministic AFTER surface from post-settlement results', () => {
    const surface = deriveAfterCommandSurface(settledPostmortem);

    expect(surface?.stage).toBe('after');
    expect(surface?.lifecycleRisk.primaryDriver).toBe('inflated_thresholds');
    expect(surface?.after?.outcomeLabel).toBe('Mixed');
    expect(surface?.after?.winningLegHighlight?.player).toBe('Jamal Murray');
    expect(surface?.after?.breakingLegHighlight?.player).toBe('Aaron Gordon');
    expect(surface?.after?.nearMissHighlight).toMatch(/0.5 short/i);
    expect(surface?.after?.actionGuidance.action_label).toMatch(/review postmortem/i);
    expect(surface?.after?.ticketThesis.thesis_status).toBe('mixed_close');
    expect(surface?.after?.ticketThesis.continuity_read).toMatch(/carry-through|matched the final break pattern/i);
    expect(surface?.recommendation).toMatch(/review postmortem/i);
  });

  it('handles settled edge cases from tracked ticket state without faking precision', () => {
    const trackedState: SlipTrackingState = {
      slipId: 'slip-after',
      trace_id: 'trace-after',
      createdAtIso: '2026-03-22T00:00:00.000Z',
      mode: 'demo',
      status: 'settled',
      legs: [
        {
          legId: 'a',
          gameId: 'g1',
          player: 'Player A',
          market: 'points',
          line: '20.5',
          volatility: 'low',
          outcome: 'hit',
          currentValue: 24,
          targetValue: 20.5,
          updatedAtIso: '2026-03-22T02:00:00.000Z'
        },
        {
          legId: 'b',
          gameId: 'g2',
          player: 'Player B',
          market: 'assists',
          line: '6.5',
          volatility: 'medium',
          outcome: 'push',
          currentValue: 6.5,
          targetValue: 6.5,
          updatedAtIso: '2026-03-22T02:00:00.000Z'
        },
        {
          legId: 'c',
          gameId: 'g3',
          player: 'Player C',
          market: 'rebounds',
          line: '8.5',
          volatility: 'high',
          outcome: 'void',
          currentValue: 0,
          targetValue: 8.5,
          updatedAtIso: '2026-03-22T02:00:00.000Z'
        }
      ]
    };

    const surface = deriveAfterCommandSurface(trackedState);

    expect(surface?.after?.outcomeLabel).toBe('Partial');
    expect(surface?.legs.map((leg) => leg.status)).toEqual(
      expect.arrayContaining(['cleared', 'push', 'void'])
    );
    expect(surface?.after?.nearMissHighlight).toBeNull();
    expect(surface?.after?.actionEvidence.secondary_evidence?.key).toBe('push_void_heavy_close');
    expect(surface?.nextActionHref).toContain('/control?');
  });

  it('keeps DURING and AFTER continuity language aligned around strongest and weakest legs', () => {
    const liveSurface = deriveLiveCommandSurface(baseTicket);
    const afterSurface = deriveAfterCommandSurface(settledPostmortem);

    expect(liveSurface?.attention).toMatch(/Strongest leg: Jamal Murray/i);
    expect(liveSurface?.attention).toMatch(/Weakest leg: Aaron Gordon/i);
    expect(afterSurface?.after?.winningLegHighlight?.player).toBe('Jamal Murray');
    expect(afterSurface?.after?.breakingLegHighlight?.player).toBe('Aaron Gordon');
    expect(afterSurface?.lifecycleRisk.primaryDriver).toBe('inflated_thresholds');
  });
});
