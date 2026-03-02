/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it } from 'vitest';

import { clearTrackedTickets, listTrackedTickets, saveTrackedTicket } from '@/src/core/track/store';

describe('tracked ticket store', () => {
  beforeEach(() => {
    window.localStorage.clear();
    clearTrackedTickets();
  });

  it('dedupes by createdAt + legs hash', () => {
    const base = {
      createdAt: '2026-02-26T10:00:00.000Z',
      sourceHint: 'paste',
      rawSlipText: 'same',
      legs: [{ legId: 'leg-1', league: 'NBA', player: 'Player A', marketType: 'points' as const, threshold: 22.5, direction: 'over' as const, source: 'paste', parseConfidence: 'high' as const }]
    };
    saveTrackedTicket({ ...base, ticketId: 'ticket-1' });
    saveTrackedTicket({ ...base, ticketId: 'ticket-2' });
    expect(listTrackedTickets()).toHaveLength(1);
  });

  it('preserves lineage fields on roundtrip', () => {
    saveTrackedTicket({
      ticketId: 'ticket-trace',
      createdAt: '2026-02-26T10:00:00.000Z',
      sourceHint: 'paste',
      rawSlipText: 'lineage',
      trace_id: 'trace-99',
      run_id: 'mismatch-will-be-normalized',
      slip_id: 'slip-99',
      legs: [{ legId: 'leg-1', league: 'NBA', player: 'Player A', marketType: 'points', threshold: 20.5, direction: 'over', source: 'paste', parseConfidence: 'high' }]
    });

    const [stored] = listTrackedTickets();
    expect(stored?.trace_id).toBe('trace-99');
    expect(stored?.run_id).toBe('trace-99');
    expect(stored?.slip_id).toBe('slip-99');
  });
});
