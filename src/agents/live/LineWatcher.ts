import type { MarketType } from '../../core/markets/marketType';
import { computeLineConsensus } from '../../core/providers/lineConsensus';
import { providerRegistry } from '../../core/providers/registry.server';
import { buildProvenance } from '../../core/sources/provenance';
import type { LineWatcherResult, PlatformLine } from './types';

export interface LineWatcherPreload {
  platformLines: PlatformLine[];
  provenanceSources: Array<{ provider: string; url: string; retrievedAt: string }>;
  fallbackReason?: string;
}

export const runLineWatcher = async (input: {
  sport: string;
  eventIds: string[];
  player: string;
  marketType: MarketType;
  preload?: LineWatcherPreload;
}): Promise<LineWatcherResult> => {
  const preloaded = input.preload;
  const platformLines = preloaded
    ? preloaded.platformLines.filter((line) => line.player === input.player && line.marketType === input.marketType)
    : (await providerRegistry.oddsProvider.fetchEventOdds({ sport: input.sport, eventIds: input.eventIds, marketType: input.marketType })).platformLines.filter((line) => line.player === input.player && line.marketType === input.marketType);

  const consensus = computeLineConsensus(platformLines);
  return {
    platformLines,
    ...consensus,
    provenance: consensus.provenance.sources.length > 0 ? consensus.provenance : buildProvenance(preloaded?.provenanceSources ?? []),
    fallbackReason: preloaded?.fallbackReason
  };
};
