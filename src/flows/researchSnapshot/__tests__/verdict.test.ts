import { describe, expect, it } from 'vitest';

import { scoreLiveLegVerdict } from '../verdict';

describe('scoreLiveLegVerdict', () => {
  it('weights L5/L10 primarily and uses season baseline as reference', () => {
    const lowRecent = scoreLiveLegVerdict({
      selection: 'A',
      marketType: 'points',
      hitProfile: {
        hitProfile: { l5: 20, l10: 25, seasonAvg: 18 },
        provenance: { asOf: '2024-01-01T00:00:00.000Z', sources: [] }
      },
      lineContext: {
        platformLines: [],
        consensusLine: 25,
        divergence: { spread: 0.4, bestLine: null, worstLine: null, warning: false },
        provenance: { asOf: '2024-01-01T00:00:00.000Z', sources: [] }
      },
      opponentContext: { provenance: { asOf: '2024-01-01T00:00:00.000Z', sources: [] } },
      injury: { tags: [], severity: 'low', provenance: { asOf: '2024-01-01T00:00:00.000Z', sources: [] } },
      verdict: { score: 0, label: 'Pass', riskTag: 'High' }
    });

    const highRecent = scoreLiveLegVerdict({
      selection: 'A',
      marketType: 'points',
      hitProfile: {
        hitProfile: { l5: 55, l10: 60, seasonAvg: 18 },
        provenance: { asOf: '2024-01-01T00:00:00.000Z', sources: [] }
      },
      lineContext: {
        platformLines: [],
        consensusLine: 25,
        divergence: { spread: 0.4, bestLine: null, worstLine: null, warning: false },
        provenance: { asOf: '2024-01-01T00:00:00.000Z', sources: [] }
      },
      opponentContext: { provenance: { asOf: '2024-01-01T00:00:00.000Z', sources: [] } },
      injury: { tags: [], severity: 'low', provenance: { asOf: '2024-01-01T00:00:00.000Z', sources: [] } },
      verdict: { score: 0, label: 'Pass', riskTag: 'High' }
    });

    expect(highRecent.score).toBeGreaterThan(lowRecent.score);
    expect(highRecent.label).toBe('Strong');
  });
});
