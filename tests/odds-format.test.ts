import { describe, expect, it } from 'vitest';

import { calculateProfit, calculateRoiPercent, normalizeOdds } from '../src/core/measurement/oddsFormat';

describe('odds format normalization and settlement math', () => {
  it('handles american odds profit and roi', () => {
    const stake = 100;

    const minus110 = calculateProfit({ stake, format: 'american', price: -110, outcome: 'won' });
    expect(minus110).toBe(90.91);
    expect(calculateRoiPercent(minus110, stake)).toBe(90.91);

    const plus120 = calculateProfit({ stake, format: 'american', price: 120, outcome: 'won' });
    expect(plus120).toBe(120);
    expect(calculateRoiPercent(plus120, stake)).toBe(120);
  });

  it('handles decimal odds profit and roi', () => {
    const stake = 100;

    const decimal191 = calculateProfit({ stake, format: 'decimal', price: 1.91, outcome: 'won' });
    expect(decimal191).toBe(91);
    expect(calculateRoiPercent(decimal191, stake)).toBe(91);

    const decimal220 = calculateProfit({ stake, format: 'decimal', price: 2.2, outcome: 'won' });
    expect(decimal220).toBe(120);
    expect(calculateRoiPercent(decimal220, stake)).toBe(120);
  });

  it('normalizes implied format to decimal and probability', () => {
    const normalized = normalizeOdds(0.5, 'implied');
    expect(normalized.decimalOdds).toBe(2);
    expect(normalized.impliedProbability).toBe(0.5);
  });
});
