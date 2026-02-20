import 'server-only';

import { getProviderRegistry } from '@/src/core/providers/registry.server';

import { createTrustedContextProvider } from './trustedContextProvider';
import type { TrustedContextBundle } from './types';

type FetchInput = {
  sport: 'nba' | 'nfl' | 'soccer';
  teams: Array<{ teamId?: string; team?: string }>;
  players: Array<{ playerId?: string; player?: string; teamId?: string; team?: string }>;
  eventIds?: string[];
};

export const trustedContextProvider = createTrustedContextProvider({
  injuries: {
    fetchInjuries: async () => {
      if (!process.env.SPORTSDATA_API_KEY && !process.env.TRUSTED_SPORTSDATAIO_KEY) {
        return {
          asOf: new Date().toISOString(),
          items: [],
          sources: [],
          fallbackReason: 'provider key missing: SPORTSDataIO'
        };
      }
      return {
        asOf: new Date().toISOString(),
        items: [],
        sources: [],
        fallbackReason: 'no_data'
      };
    }
  },
  odds: {
    fetchEventOdds: async (input) => {
      if (!process.env.ODDS_API_KEY && !process.env.TRUSTED_ODDS_API_KEY) {
        return {
          platformLines: [],
          provenance: { sources: [] },
          fallbackReason: 'provider key missing: Odds API'
        };
      }
      return getProviderRegistry().oddsProvider.fetchEventOdds(input);
    }
  }
});

export async function fetchTrustedContext(input: FetchInput): Promise<TrustedContextBundle> {
  return trustedContextProvider.fetchTrustedContext(input);
}
