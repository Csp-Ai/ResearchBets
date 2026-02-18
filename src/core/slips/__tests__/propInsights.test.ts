import { describe, expect, it } from 'vitest';

import { buildPropLegInsight } from '../propInsights';

describe('buildPropLegInsight', () => {
  it('builds prop labels and baseline insight tags for preview cards', () => {
    const insight = buildPropLegInsight({ selection: 'Nikola Jokic', market: 'pra', odds: '-105' });

    expect(insight.marketType).toBe('pra');
    expect(insight.marketLabel).toBe('PRA');
    expect(insight.hitRateLast5).toBeGreaterThan(0);
    expect(insight.trend.length).toBeGreaterThan(0);
  });
});
