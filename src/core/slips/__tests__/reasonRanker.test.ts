import { describe, expect, it } from 'vitest';

import { dedupeReasons, rankReasons, selectTopReasons } from '@/src/core/slips/reasonRanker';
import { presentRecommendation } from '@/src/core/slips/recommendationPresentation';

describe('reasonRanker', () => {
  it('dedupes and prioritizes reasons deterministically', () => {
    const ranked = rankReasons([
      'volatility summary: 2/3 high-vol legs.',
      'Correlation check: same-team stacking detected.',
      'Fragility score is above safe threshold.',
      'fragility score is above safe threshold',
      'Generic follow-up.'
    ], {
      dominant: 'Fragility score is above safe threshold.',
      correlation: true,
      volatility: '2/3 high-vol legs'
    });

    expect(ranked[0]).toBe('Fragility score is above safe threshold');
    expect(ranked[1]?.toLowerCase()).toContain('correlation');
    expect(selectTopReasons(ranked, 3)).toHaveLength(3);
    expect(dedupeReasons(['A.', 'a', 'B'])).toEqual(['A', 'B']);
  });

  it('maps KEEP recommendation to TAKE for presentation', () => {
    expect(presentRecommendation('KEEP')).toBe('TAKE');
    expect(presentRecommendation('MODIFY')).toBe('MODIFY');
    expect(presentRecommendation('PASS')).toBe('PASS');
  });
});
