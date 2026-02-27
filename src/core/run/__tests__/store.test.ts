import { describe, expect, it } from 'vitest';

import { computeInlineSlipWarnings } from '@/src/core/run/store';

describe('computeInlineSlipWarnings', () => {
  it('returns warning signals for same-game overstack slips', () => {
    const warnings = computeInlineSlipWarnings([
      { id: '1', player: 'Jalen Green', marketType: 'assists', line: '6+', odds: '+125', game: 'HOU @ DAL' },
      { id: '2', player: 'Alperen Sengun', marketType: 'points', line: '20+', odds: '+115', game: 'HOU @ DAL' },
      { id: '3', player: 'Luka Doncic', marketType: 'points', line: '30+', odds: '+120', game: 'HOU @ DAL' },
      { id: '4', player: 'Kyrie Irving', marketType: 'threes', line: '4+', odds: '+155', game: 'HOU @ DAL' }
    ]);

    expect(warnings.weakestLeg).toBeTruthy();
    expect(warnings.highCorrelation).toBe(true);
    expect(warnings.overstacked).toBe(true);
  });

  it('is empty for blank slips', () => {
    expect(computeInlineSlipWarnings([])).toEqual({ weakestLeg: null, highCorrelation: false, overstacked: false });
  });
});
