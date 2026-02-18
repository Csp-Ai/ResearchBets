import { describe, expect, it } from 'vitest';

import { impliedProbabilitiesFromLines, moneylineToProbability } from '../impliedProbabilities';

describe('implied probabilities', () => {
  it('converts moneyline to implied probability', () => {
    expect(moneylineToProbability(-150)).toBeCloseTo(0.6, 3);
    expect(moneylineToProbability(130)).toBeCloseTo(0.4348, 3);
  });

  it('removes vig when requested', () => {
    const result = impliedProbabilitiesFromLines({
      homeMoneyline: -120,
      awayMoneyline: 110,
      removeVig: true
    });
    expect(result.source).toBe('moneyline');
    expect(result.home.implied + result.away.implied).toBeCloseTo(1, 3);
  });

  it('falls back safely when moneyline is missing', () => {
    const result = impliedProbabilitiesFromLines({ homeMoneyline: -110, awayMoneyline: null });
    expect(result.source).toBe('fallback');
    expect(result.home.degraded).toBe(true);
    expect(result.home.implied).toBe(0.5);
  });
});
