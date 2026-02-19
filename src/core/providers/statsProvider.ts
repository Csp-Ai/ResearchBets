import { buildPropLegInsight } from '@/src/core/slips/propInsights';

import type { ExtractedLeg } from '@/src/core/run/types';

const hash = (input: string): number => {
  let value = 0;
  for (let i = 0; i < input.length; i += 1) value = (value * 31 + input.charCodeAt(i)) >>> 0;
  return value;
};

const clampPct = (value: number): number => Math.max(35, Math.min(85, Math.round(value)));

export async function enrichStats(leg: ExtractedLeg): Promise<{ l5: number; l10: number; season?: number; vsOpp?: number; source: 'live' | 'fallback'; notes: string[] }> {
  if (leg.market) {
    const insight = buildPropLegInsight({ selection: leg.selection, market: leg.market, odds: leg.odds });
    return {
      l5: insight.hitRateLast5,
      l10: clampPct(insight.hitRateLast5 - 4),
      season: clampPct(insight.hitRateLast5 - 6),
      vsOpp: clampPct(insight.hitRateLast5 - 8),
      source: 'live',
      notes: [
        `${insight.marketLabel} trend: ${insight.trend}`,
        insight.matchupNote
      ]
    };
  }

  const seed = hash(leg.selection.toLowerCase());
  const l10 = 45 + (seed % 31);
  const l5 = clampPct(l10 + ((seed >> 3) % 9) - 4);
  return {
    l5,
    l10,
    season: clampPct(l10 - 3),
    vsOpp: clampPct(l10 - 5),
    source: 'fallback',
    notes: ['Fallback profile used: missing market-level stat mapping.']
  };
}
