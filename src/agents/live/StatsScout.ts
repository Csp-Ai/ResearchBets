import type { MarketType } from '../../core/markets/marketType';
import { providerRegistry } from '../../core/providers/registry';
import { buildProvenance } from '../../core/sources/provenance';
import type { HitProfileResult } from './types';

export const runStatsScout = async (input: {
  player: string;
  marketType: MarketType;
  opponent?: string;
}): Promise<HitProfileResult> => {
  try {
    const primary = await providerRegistry.statsProvider.primary.fetchPlayerStats(input);
    return {
      hitProfile: {
        l5: primary.l5,
        l10: primary.l10,
        seasonAvg: primary.seasonAvg
      },
      provenance: buildProvenance([
        {
          provider: providerRegistry.statsProvider.primary.id,
          url: primary.sourceUrl,
          retrievedAt: primary.asOf
        }
      ])
    };
  } catch {
    const fallback = await providerRegistry.statsProvider.fallback.fetchPlayerStats(input);
    return {
      hitProfile: {
        l5: fallback.l5,
        l10: fallback.l10,
        seasonAvg: fallback.seasonAvg
      },
      provenance: buildProvenance([
        {
          provider: providerRegistry.statsProvider.fallback.id,
          url: fallback.sourceUrl,
          retrievedAt: fallback.asOf
        }
      ]),
      fallbackReason: 'primary_stats_provider_unavailable'
    };
  }
};
