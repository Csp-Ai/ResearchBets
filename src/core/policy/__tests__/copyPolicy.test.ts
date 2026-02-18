import { describe, expect, it } from 'vitest';

import {
  BANNED_TOUT_PHRASES,
  findBannedCopyViolations,
  hasAllowedHedging,
  validateCopyText
} from '../copyPolicy';

describe('copy policy checker', () => {
  it('flags banned deterministic/tout phrases', () => {
    const text = 'This is a guaranteed lock and will hit tonight.';
    const violations = findBannedCopyViolations(text);

    expect(violations.map((item) => item.phrase)).toEqual(
      expect.arrayContaining(['guaranteed', 'lock', 'will hit'])
    );
  });

  it('keeps compliant hedged language allowed', () => {
    const text = 'Delta is not a pick and may change as probabilities update.';
    const result = validateCopyText(text);

    expect(result.compliant).toBe(true);
    expect(result.hedged).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('tracks the banned phrase catalog expected by policy', () => {
    expect(BANNED_TOUT_PHRASES).toEqual(
      expect.arrayContaining(['lock', 'guaranteed', 'free money'])
    );
  });

  it('detects when copy is unhedged even without violations', () => {
    expect(hasAllowedHedging('Model update pending.')).toBe(false);
  });
});
