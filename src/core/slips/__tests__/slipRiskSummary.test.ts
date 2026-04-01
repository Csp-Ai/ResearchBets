import { describe, expect, it } from 'vitest';

import { deriveSlipRiskSummary, formatWeakestLeg } from '@/src/core/slips/slipRiskSummary';

describe('deriveSlipRiskSummary', () => {
  it('triggers PASS for high fragility and correlation stacks', () => {
    const summary = deriveSlipRiskSummary([
      { id: 'a', player: 'Luka Doncic', market: 'assists', line: '11', odds: '+180', team: 'DAL', game: 'LAL @ DAL', selection: 'Luka Doncic over 11 assists' },
      { id: 'b', player: 'Kyrie Irving', market: 'assists', line: '8', odds: '+170', team: 'DAL', game: 'LAL @ DAL', selection: 'Kyrie Irving over 8 assists' },
      { id: 'c', player: 'Daniel Gafford', market: 'rebounds', line: '14', odds: '+150', team: 'DAL', game: 'LAL @ DAL', selection: 'Daniel Gafford over 14 rebounds' }
    ]);

    expect(summary.recommendation).toBe('PASS');
    expect(summary.correlationFlag).toBe(true);
    expect(summary.fragilityScore).toBeGreaterThan(50);
  });

  it('does not over-flag same market diversity without structured edges', () => {
    const summary = deriveSlipRiskSummary([
      { id: 'a', player: 'Player A', market: 'assists', line: '5.5', odds: '-110', game: 'A @ B', selection: 'Player A over 5.5 assists' },
      { id: 'b', player: 'Player B', market: 'assists', line: '6.5', odds: '-108', game: 'C @ D', selection: 'Player B over 6.5 assists' }
    ]);

    expect(summary.correlationFlag).toBe(false);
    expect(summary.correlationReason.toLowerCase()).toContain('no major correlation');
  });

  it('formats weakest leg as a non-empty string even from notes arrays', () => {
    const weakestLeg = formatWeakestLeg({ notes: ['aggressive alt line', 'plus money'], selection: 'bench scorer over', player: undefined });
    expect(typeof weakestLeg).toBe('string');
    expect(weakestLeg.length).toBeGreaterThan(0);
    expect(weakestLeg.toLowerCase()).not.toContain('undefined');
    expect(weakestLeg).not.toContain('[object');
  });
});
