import { describe, expect, it } from 'vitest';

import { americanToDecimal, breakEvenProbFromDecimal, impliedProbFromAmerican, parlayProbIndependent, payoutFromAmerican } from '@/src/core/slipMath/parlayMath';

describe('parlayMath', () => {
  it('converts american odds to decimal and implied probability', () => {
    expect(americanToDecimal(150)).toBeCloseTo(2.5, 6);
    expect(americanToDecimal(-110)).toBeCloseTo(1.9090909, 6);
    expect(impliedProbFromAmerican(150)).toBeCloseTo(0.4, 6);
    expect(impliedProbFromAmerican(-110)).toBeCloseTo(0.5238095, 6);
  });

  it('computes break-even and independent parlay probability', () => {
    expect(breakEvenProbFromDecimal(2.5)).toBeCloseTo(0.4, 6);
    expect(parlayProbIndependent([0.6, 0.5, 0.4])).toBeCloseTo(0.12, 6);
  });

  it('computes deterministic payout from american odds', () => {
    expect(payoutFromAmerican(100, 150)).toEqual({ profit: 150, totalReturn: 250 });
  });
});
