import { buildProvenance } from '../../core/sources/provenance';
import type { GameLog } from '../../core/providers/sportsdataio';
import type { OpponentContextResult } from './types';

const averagePoints = (logs: GameLog[]): number | undefined => {
  const values = logs.map((log) => log.stats.points).filter((v): v is number => typeof v === 'number');
  if (values.length === 0) return undefined;
  return Number((values.reduce((sum, v) => sum + v, 0) / values.length).toFixed(2));
};

export const runOpponentContextScout = async (input: {
  opponentTeamId?: string;
  logs?: GameLog[];
  provenanceSources?: Array<{ provider: string; url: string; retrievedAt: string }>;
  fallbackReason?: string;
}): Promise<OpponentContextResult> => {
  if (!input.opponentTeamId) {
    return {
      provenance: buildProvenance([]),
      fallbackReason: 'opponent_unavailable'
    };
  }

  const vsOpponent = averagePoints(input.logs ?? []);
  return {
    vsOpponent,
    provenance: buildProvenance(input.provenanceSources ?? []),
    fallbackReason: input.fallbackReason
  };
};
