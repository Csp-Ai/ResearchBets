/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it } from 'vitest';

import { saveAppliedIntervention } from '@/src/core/interventions/decisionStore';
import { settleTicket } from '@/src/core/review/settlement';
import { listPostmortems, saveDraftPostmortem } from '@/src/core/review/store';
import type { OpenTicket } from '@/src/core/live/openTickets';

const ticket: OpenTicket = {
  ticketId: 'ticket-1',
  title: 'Tracked ticket #1',
  odds: '+220',
  wager: '$10',
  mode: 'demo',
  createdAt: '2026-01-01T00:00:00.000Z',
  legs: [
    {
      legId: 'leg-1',
      gameId: 'A@B',
      player: 'Player A',
      marketType: 'assists',
      currentValue: 4,
      threshold: 5.5,
      requiredRemaining: 1.5,
      paceProjection: 5,
      status: 'behind',
      volatility: 'high',
      minutesRisk: true,
      reasonChips: ['High-variance market', 'Ladder distance'],
      coverage: { coverage: 'covered' }
    }
  ],
  onPaceCount: 0,
  weakestLeg: {
    legId: 'leg-1',
    gameId: 'A@B',
    player: 'Player A',
    marketType: 'assists',
    currentValue: 4,
    threshold: 5.5,
    requiredRemaining: 1.5,
    paceProjection: 5,
    status: 'behind',
    volatility: 'high',
    minutesRisk: true,
    reasonChips: ['High-variance market', 'Ladder distance'],
    coverage: { coverage: 'covered' }
  },
  coverage: { coverage: 'full', coveredLegs: 1, totalLegs: 1 }
};

describe('settlement flow persistence', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('writes postmortem, dedupes by ticketId, and attaches coach snapshot', () => {
    saveDraftPostmortem({
      ticketId: 'ticket-1',
      savedAt: '2026-01-01T00:30:00.000Z',
      killLeg: 'Player A assists',
      reasons: ['Behind pace'],
      fragilityScore: 72,
      coverageSummary: 'full:1/1'
    });

    settleTicket({ ticket, status: 'lost', finalValues: { 'leg-1': 4 }, cashoutTaken: 6.25 });
    settleTicket({ ticket, status: 'lost', finalValues: { 'leg-1': 4.5 }, cashoutTaken: 5.5 });

    const records = listPostmortems().filter((item) => item.ticketId === 'ticket-1');
    expect(records).toHaveLength(1);
    expect(records[0]?.coachSnapshot?.killLeg).toContain('Player A');
    expect(records[0]?.cashoutTaken).toBe(5.5);
  });

  it('preserves tracked lineage and provenance when saving postmortems', () => {
    const lineageTicket: OpenTicket = {
      ...ticket,
      ticketId: 'ticket-lineage-1',
      trace_id: 'trace-lineage-1',
      run_id: 'trace-lineage-1',
      slip_id: 'slip-lineage-1',
      mode: 'cache',
      provenance: { mode: 'cache', source_type: 'parser_derived', review_state: 'reviewed' }
    };

    const record = settleTicket({
      ticket: lineageTicket,
      status: 'lost',
      finalValues: { 'leg-1': 4 }
    });

    expect(record.trace_id).toBe('trace-lineage-1');
    expect(record.run_id).toBe('trace-lineage-1');
    expect(record.slip_id).toBe('slip-lineage-1');
    expect(record.provenance).toEqual({
      mode: 'cache',
      source_type: 'parser_derived',
      review_state: 'reviewed'
    });
  });

  it('preserves live entry context through settlement without claiming exact placement time', () => {
    const liveEntryTicket: OpenTicket = {
      ...ticket,
      ticketId: 'ticket-entry-context',
      mode: 'live',
      entrySnapshot: {
        capturedAt: '2026-09-20T20:05:00.000Z',
        captureSource: 'first_verified_after_tracking',
        timing: 'live',
        exactDecisionTime: false,
        legs: {
          'leg-1': {
            capturedAt: '2026-09-20T20:05:00.000Z',
            currentValue: 4,
            elapsedGameMinutes: 12,
            quarter: 2,
            timeRemainingSec: 840,
          },
        },
      },
    };

    const record = settleTicket({
      ticket: liveEntryTicket,
      status: 'lost',
      finalValues: { 'leg-1': 4 },
    });

    expect(record.entrySnapshot).toEqual(liveEntryTicket.entrySnapshot);
    expect(record.narrative.join(' ')).toMatch(/not asserted as the exact sportsbook placement time/i);
  });

  it('links an explicit applied threshold intervention to verified settlement', () => {
    const verifiedTicket: OpenTicket = {
      ...ticket,
      ticketId: 'ticket-linked-1',
      trace_id: 'trace-linked-1',
      run_id: 'trace-linked-1',
      slip_id: 'slip-linked-1',
      mode: 'live',
      provenance: { mode: 'live', source_type: 'tracked_ticket', review_state: 'verified' },
      legs: [{ ...ticket.legs[0]!, threshold: 4.5, currentValue: 5 }],
      weakestLeg: { ...ticket.weakestLeg, threshold: 4.5, currentValue: 5 }
    };

    saveAppliedIntervention({
      interventionId: 'trace-linked-1:safety:leg-1:5.5:4.5',
      appliedAt: '2026-09-14T20:00:00.000Z',
      traceId: 'trace-linked-1',
      slipId: 'slip-linked-1',
      mode: 'live',
      interventionType: 'safety',
      legId: 'leg-1',
      player: 'Player A',
      marketType: 'assists',
      currentLine: 5.5,
      targetLine: 4.5,
      currentProbability: 0.44,
      targetProbability: 0.62,
      probabilityDelta: 0.18
    });

    const record = settleTicket({
      ticket: verifiedTicket,
      status: 'won',
      finalValues: { 'leg-1': 5 }
    });

    expect(record.thresholdCounterfactuals).toHaveLength(1);
    expect(record.thresholdCounterfactuals?.[0]).toMatchObject({
      eligible: true,
      originalLegSurvived: false,
      recommendedLegSurvived: true,
      effect: 'preserved_leg'
    });

    const persisted = listPostmortems().find((item) => item.ticketId === 'ticket-linked-1');
    expect(persisted?.thresholdCounterfactuals?.[0]?.effect).toBe('preserved_leg');
  });
});
