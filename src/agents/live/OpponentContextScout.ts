import { createHash } from 'node:crypto';

import { buildProvenance } from '../../core/sources/provenance';
import type { OpponentContextResult } from './types';

const hashNumber = (seed: string): number => Number.parseInt(createHash('sha1').update(seed).digest('hex').slice(0, 6), 16);

export const runOpponentContextScout = async (input: {
  player: string;
  opponent?: string;
}): Promise<OpponentContextResult> => {
  if (!input.opponent) {
    return {
      provenance: buildProvenance([]),
      fallbackReason: 'opponent_unavailable'
    };
  }

  const base = hashNumber(`${input.player}:${input.opponent}`);
  return {
    defenseRank: (base % 30) + 1,
    vsOpponent: Number((10 + (base % 180) / 10).toFixed(1)),
    provenance: buildProvenance([
      {
        provider: 'opponent-context',
        url: `https://context.example.com/opponent/${encodeURIComponent(input.opponent)}`,
        retrievedAt: new Date().toISOString()
      }
    ])
  };
};
