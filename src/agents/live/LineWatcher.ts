import type { MarketType } from '../../core/markets/marketType';
import { computeLineConsensus } from '../../core/providers/lineConsensus';
import { providerRegistry } from '../../core/providers/registry';
import { buildProvenance } from '../../core/sources/provenance';
import type { LineWatcherResult, PlatformLine } from './types';

export const runLineWatcher = async (input: {
  player: string;
  marketType: MarketType;
}): Promise<LineWatcherResult> => {
  const platformLines: PlatformLine[] = [];
  const unavailable: string[] = [];

  for (const provider of providerRegistry.linesProvider) {
    try {
      const lines = await provider.fetchLines(input);
      platformLines.push(...lines);
    } catch {
      unavailable.push(provider.id);
    }
  }

  const consensus = computeLineConsensus(platformLines);
  return {
    platformLines,
    ...consensus,
    provenance:
      consensus.provenance.sources.length > 0
        ? consensus.provenance
        : buildProvenance([]),
    fallbackReason: unavailable.length > 0 ? `line_providers_unavailable:${unavailable.join(',')}` : undefined
  };
};
