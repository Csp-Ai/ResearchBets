import { describe, expect, it } from 'vitest';

import { buildEdgeProfile } from '@/src/core/review/edgeProfile';
import type { PostmortemRecord } from '@/src/core/review/types';

const sample: PostmortemRecord[] = [
  {
    ticketId: 't1',
    createdAt: '2026-01-01T00:00:00.000Z',
    settledAt: '2026-01-01T01:00:00.000Z',
    status: 'lost',
    legs: [
      { legId: 'l1', player: 'A', statType: 'assists', target: 6.5, finalValue: 5.5, delta: -1, hit: false, missTags: ['bust_by_one', 'assist_variance'], missNarrative: '', lessonHint: '' },
      { legId: 'l2', player: 'B', statType: 'points', target: 24.5, finalValue: 26, delta: 1.5, hit: true, missTags: [], missNarrative: '', lessonHint: '' }
    ],
    coverage: { level: 'partial', reasons: ['provider_unavailable'] },
    fragility: { score: 72, chips: [] },
    narrative: []
  },
  {
    ticketId: 't2',
    createdAt: '2026-01-02T00:00:00.000Z',
    settledAt: '2026-01-02T01:00:00.000Z',
    status: 'won',
    legs: [
      { legId: 'l3', player: 'C', statType: 'rebounds', target: 9.5, finalValue: 11, delta: 1.5, hit: true, missTags: [], missNarrative: '', lessonHint: '' }
    ],
    coverage: { level: 'full', reasons: [] },
    fragility: { score: 30, chips: [] },
    narrative: []
  }
];

describe('buildEdgeProfile', () => {
  it('aggregates rates and tag counts', () => {
    const profile = buildEdgeProfile(sample);
    expect(profile.totalTickets).toBe(2);
    expect(profile.winRate).toBe(0.5);
    expect(profile.topMissTags[0]?.tag).toBe('bust_by_one');
    expect(profile.killerStatTypes[0]?.statType).toBe('assists');
    expect(profile.nearMissRate).toBe(0.5);
  });
});
