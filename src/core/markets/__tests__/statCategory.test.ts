import { describe, expect, it } from 'vitest';

import { FEATURED_STAT_CATEGORY_ORDER, FEATURED_STAT_LABEL, mapMarketToFeaturedStatCategory } from '@/src/core/markets/statCategory';

describe('mapMarketToFeaturedStatCategory', () => {
  it('maps the featured five buckets', () => {
    expect(mapMarketToFeaturedStatCategory('pra')).toBe('pra');
    expect(mapMarketToFeaturedStatCategory('points')).toBe('points');
    expect(mapMarketToFeaturedStatCategory('rebounds')).toBe('rebounds');
    expect(mapMarketToFeaturedStatCategory('assists')).toBe('assists');
    expect(mapMarketToFeaturedStatCategory('threes')).toBe('threes');
  });

  it('returns null for non-featured markets', () => {
    expect(mapMarketToFeaturedStatCategory('moneyline')).toBeNull();
    expect(mapMarketToFeaturedStatCategory('spread')).toBeNull();
  });

  it('keeps bettor ordering with PRA first', () => {
    expect(FEATURED_STAT_CATEGORY_ORDER).toEqual(['pra', 'points', 'rebounds', 'assists', 'threes']);
    expect(FEATURED_STAT_LABEL.pra).toBe('PRA');
  });
});
