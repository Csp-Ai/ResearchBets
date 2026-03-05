import { describe, expect, it } from 'vitest';

import { combineDisplayedParlayOdds, decimalToAmericanDisplayed } from '@/src/core/slipMath/displayedParlayOdds';

describe('displayed parlay odds', () => {
  it('combines two -110 legs', () => {
    const result = combineDisplayedParlayOdds(['-110', '-110']);
    expect(result.american).toBe(265);
  });

  it('rounds plus prices to nearest 5', () => {
    expect(decimalToAmericanDisplayed(8.92)).toBe(790);
  });

  it('handles mixed signs', () => {
    const result = combineDisplayedParlayOdds(['-120', '+140', '+180']);
    expect(result.usedLegs).toBe(3);
    expect(result.american).toBeGreaterThan(800);
  });
});
