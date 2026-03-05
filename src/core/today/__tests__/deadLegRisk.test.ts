import { describe, expect, it } from 'vitest';

import { deriveDeadLegRisk } from '@/src/core/today/rowIntelligence';

describe('deriveDeadLegRisk', () => {
  it('flags high risk with low minutes and low 3PA', () => {
    const result = deriveDeadLegRisk({ market: 'threes', roleConfidence: 'low', minutesL3Avg: 20, threesAttL5Avg: 3.1, odds: '+170' });
    expect(result.deadLegRisk).toBe('high');
    expect(result.deadLegReasons).toContain('Low minutes (L3)');
    expect(result.deadLegReasons).toContain('Low 3PA volume (L5)');
    expect(result.deadLegReasons).toContain('Role volatility');
    expect(result.deadLegReasons).toContain('Mismatch risk');
  });
});
