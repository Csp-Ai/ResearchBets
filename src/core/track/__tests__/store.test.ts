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
});
