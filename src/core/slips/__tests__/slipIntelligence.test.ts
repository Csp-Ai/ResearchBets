import { describe, expect, it } from 'vitest';

import { computeSlipIntelligence } from '../slipIntelligence';

describe('computeSlipIntelligence', () => {
  it('flags a concentrated 7-leg same-game stack as extreme fragility', () => {
    const legs = Array.from({ length: 7 }, (_, index) => ({
      id: `leg-${index}`,
      game: 'LAL @ DAL',
      player: index < 3 ? 'Luka Doncic' : `Player ${index}`,
      marketType: 'points',
      line: index % 2 === 0 ? '31' : '28.5',
      odds: index < 2 ? '+180' : '+120'
    }));

    const intel = computeSlipIntelligence(legs);

    expect(intel.correlationScore).toBeGreaterThanOrEqual(85);
    expect(intel.fragilityScore).toBeGreaterThanOrEqual(85);
    expect(intel.volatilityTier).toBe('Extreme');
    expect(intel.sameGameStack).toBe(true);
    expect(intel.exposureSummary.topGames[0]).toEqual({ game: 'LAL @ DAL', count: 7 });
  });

  it('keeps a balanced 3-leg slip in low/med volatility with diverse exposure', () => {
    const intel = computeSlipIntelligence([
      { game: 'LAL @ DAL', player: 'LeBron James', line: '6.5', odds: '-110' },
      { game: 'BOS @ MIA', player: 'Jayson Tatum', line: '4.5', odds: '-105' },
      { game: 'PHI @ NYK', player: 'Jalen Brunson', line: '7.5', odds: '-115' }
    ]);

    expect(intel.correlationScore).toBeLessThan(45);
    expect(intel.fragilityScore).toBeLessThan(65);
    expect(['Low', 'Med']).toContain(intel.volatilityTier);
    expect(intel.exposureSummary.topGames.length).toBeGreaterThan(0);
    expect(intel.exposureSummary.topGames[0]!.count).toBe(1);
  });

  it('returns empty-state hints for empty slips', () => {
    const intel = computeSlipIntelligence([]);

    expect(intel.correlationScore).toBe(0);
    expect(intel.fragilityScore).toBe(0);
    expect(intel.weakestLegHints.length).toBeGreaterThan(0);
    expect(intel.weakestLegHints[0]!).toContain('No legs yet');
  });
});
