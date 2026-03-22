/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it } from 'vitest';

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
});
