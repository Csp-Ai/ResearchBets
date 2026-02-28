import { describe, expect, it } from 'vitest';

import { enforceProConstraints, inferStatType, proBuildScore, varianceClass } from '@/src/core/slipMath/legHeuristics';

describe('legHeuristics', () => {
  it('infers stat and variance classes', () => {
    expect(inferStatType('assists')).toBe('playmaking');
    expect(varianceClass('playmaking')).toBe('high');
  });

  it('scores lower confidence and ladder legs lower', () => {
    const baseline = proBuildScore({ id: 'a', player: 'A', marketType: 'points', line: '21.5', confidence: 0.8 });
    const ladder = proBuildScore({ id: 'b', player: 'B', marketType: 'points', line: '34.5', confidence: 0.8 });
    expect(ladder).toBeLessThan(baseline);
  });

  it('flags overleveraged construction constraints', () => {
    const result = enforceProConstraints([
      { id: '1', player: 'A', marketType: 'assists', line: '8.5', confidence: 0.45, game: 'X' },
      { id: '2', player: 'B', marketType: 'threes', line: '4.5', confidence: 0.5, game: 'X' },
      { id: '3', player: 'C', marketType: 'points', line: '31.5', confidence: 0.4, game: 'X' },
      { id: '4', player: 'D', marketType: 'points', line: '18.5', confidence: 0.75, game: 'X' }
    ]);
    expect(result.warnings.join('|')).toContain('Reduce total leg count');
    expect(result.warnings.join('|')).toContain('Cap high-variance legs to 1');
    expect(result.warnings.join('|')).toContain('Correlation risk');
  });
});
