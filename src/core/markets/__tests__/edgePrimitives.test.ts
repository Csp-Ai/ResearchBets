import { describe, expect, it } from 'vitest';

import {
  computeEdgeDelta,
  computeMarketImpliedProb,
  computeModelProb,
  deriveDeterministicModelProb,
  formatPct,
  formatSignedPct,
  oddsToImpliedProbability
} from '../edgePrimitives';

describe('edgePrimitives', () => {
  it('supports american and decimal odds', () => {
    expect(oddsToImpliedProbability('-110')).toBeCloseTo(0.5238, 3);
    expect(oddsToImpliedProbability('+120')).toBeCloseTo(0.4545, 3);
    expect(oddsToImpliedProbability('2.0')).toBe(0.5);
  });

  it('computes market implied probability from lines', () => {
    const implied = computeMarketImpliedProb({ homeMoneyline: -120, awayMoneyline: 110 });
    expect(implied).toBeGreaterThan(0.5);
    expect(implied).toBeLessThan(0.55);
  });

  it('derives deterministic model probability', () => {
    const derived = deriveDeterministicModelProb({ idSeed: 'g1:p1', hitRateL10: 62, riskTag: 'stable' });
    expect(derived).toBeCloseTo(0.633, 3);
    expect(computeModelProb({ deterministic: { idSeed: 'g1:p1', hitRateL10: 62, riskTag: 'stable' } })).toBe(derived);
  });

  it('computes edge delta and pct formatters', () => {
    const delta = computeEdgeDelta(0.59, 0.53);
    expect(delta).toBeCloseTo(0.06, 3);
    expect(formatPct(0.592, 1)).toBe('59.2%');
    expect(formatSignedPct(delta, 1)).toBe('+6.0%');
  });
});
