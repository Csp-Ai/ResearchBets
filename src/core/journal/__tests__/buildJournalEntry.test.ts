import { describe, expect, it } from 'vitest';

import { buildJournalEntry } from '../buildJournalEntry';
import type { SlipTrackingState } from '@/src/core/slips/trackingTypes';

const tracking: SlipTrackingState = {
  slipId: 'slip-j1',
  createdAtIso: '2026-01-01T00:00:00.000Z',
  mode: 'demo',
  status: 'eliminated',
  eliminatedByLegId: 'l2',
  legs: [
    { legId: 'l1', gameId: 'g1', player: 'A', market: 'points', line: '20.5', volatility: 'low', convictionAtBuild: 80, outcome: 'hit', updatedAtIso: '2026-01-01T00:00:00.000Z' },
    { legId: 'l2', gameId: 'g2', player: 'B', market: 'rebounds', line: '9.5', volatility: 'high', convictionAtBuild: 75, outcome: 'miss', missType: 'variance', updatedAtIso: '2026-01-01T00:00:00.000Z' },
    { legId: 'l3', gameId: 'g3', player: 'C', market: 'assists', line: '6.5', volatility: 'medium', convictionAtBuild: 72, outcome: 'hit', updatedAtIso: '2026-01-01T00:00:00.000Z' }
  ],
  summary: { learningHighlights: ['Parlay eliminated by B.'] }
};

describe('buildJournalEntry', () => {
  it('captures eliminatedBy, runbacks, and hit/miss buckets', () => {
    const entry = buildJournalEntry(tracking);

    expect(entry.eliminatedByLegId).toBe('l2');
    expect(entry.whatHit).toHaveLength(2);
    expect(entry.whatMissed).toHaveLength(1);
    expect(entry.runbackCandidates.length).toBe(2);
    expect(entry.notes.some((note) => note.includes('Do not auto-blacklist'))).toBe(true);
  });
});
