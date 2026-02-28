import { describe, expect, it } from 'vitest';

import { tagMiss } from '@/src/core/review/missTagger';

describe('tagMiss', () => {
  it('deterministically tags bust_by_one', () => {
    const result = tagMiss({ statType: 'points', target: 24.5, finalValue: 23.5, delta: -1, fragilityScore: 20, fragilityChips: [], minutesCompressionRisk: false, endgameSensitivity: 20, ladder: false, coverage: 'full' });
    expect(result.missTags).toContain('bust_by_one');
  });

  it('tags assist variance and ladder distance', () => {
    const result = tagMiss({ statType: 'assists', target: 7.5, finalValue: 6.0, delta: -1.5, fragilityScore: 70, fragilityChips: [], minutesCompressionRisk: false, endgameSensitivity: 30, ladder: true, coverage: 'full' });
    expect(result.missTags).toEqual(['bust_by_one', 'assist_variance', 'ladder_distance']);
  });

  it('tags minutes compression and coverage gap', () => {
    const result = tagMiss({ statType: 'rebounds', target: 10.5, finalValue: 9, delta: -1.5, fragilityScore: 40, fragilityChips: [], minutesCompressionRisk: true, endgameSensitivity: 30, ladder: false, coverage: 'partial' });
    expect(result.missTags).toContain('minutes_compression');
    expect(result.missTags).toContain('coverage_gap');
  });
});
