import type { LineWatcherResult, PlatformLine } from '../../agents/live/types';
import { buildProvenance } from '../sources/provenance';

export const computeLineConsensus = (
  platformLines: PlatformLine[]
): Pick<LineWatcherResult, 'consensusLine' | 'divergence' | 'provenance'> => {
  if (platformLines.length === 0) {
    return {
      consensusLine: null,
      divergence: { spread: 0, bestLine: null, worstLine: null, warning: false },
      provenance: buildProvenance([])
    };
  }

  const sorted = [...platformLines].sort((a, b) => a.line - b.line);
  const sum = platformLines.reduce((acc, item) => acc + item.line, 0);
  const consensusLine = Number((sum / platformLines.length).toFixed(2));
  const bestLine = sorted[0] ?? null;
  const worstLine = sorted[sorted.length - 1] ?? null;
  const spread = Number(((worstLine?.line ?? 0) - (bestLine?.line ?? 0)).toFixed(2));

  return {
    consensusLine,
    divergence: {
      spread,
      bestLine,
      worstLine,
      warning: spread >= 1.5
    },
    provenance: buildProvenance(
      platformLines.flatMap((line) =>
        line.sources.map((source) => ({
          provider: source.provider,
          url: source.url,
          retrievedAt: source.retrievedAt
        }))
      )
    )
  };
};
