import type { MarketType } from '../markets/marketType';
import type { PlatformLine } from '../../agents/live/types';
import type { DataProvenance } from '../sources/provenance';
import type { GameLog, SeasonAverages } from './sportsdataio';

const mapMarketStatKey = (marketType: MarketType): keyof GameLog['stats'] => {
  switch (marketType) {
    case 'rebounds':
      return 'rebounds';
    case 'assists':
      return 'assists';
    case 'threes':
      return 'threes';
    default:
      return 'points';
  }
};

export interface StatsProvider {
  id: string;
  fetchRecentPlayerGameLogs(input: { sport: string; playerIds: string[]; limit: number }): Promise<{
    byPlayerId: Record<string, GameLog[]>;
    provenance: DataProvenance;
    fallbackReason?: string;
  }>;
  fetchSeasonPlayerAverages(input: { sport: string; playerIds: string[] }): Promise<{
    byPlayerId: Record<string, SeasonAverages>;
    provenance: DataProvenance;
    fallbackReason?: string;
  }>;
  fetchVsOpponentHistory(input: {
    sport: string;
    playerId: string;
    opponentTeamId?: string;
    limit: number;
  }): Promise<{ logs: GameLog[]; provenance: DataProvenance; fallbackReason?: string }>;
}

export interface OddsProvider {
  id: string;
  fetchEvents(input: { sport: string }): Promise<{ events: Array<{ id: string }>; provenance: DataProvenance; fallbackReason?: string }>;
  fetchEventOdds(input: { sport: string; eventIds: string[]; marketType: MarketType }): Promise<{
    platformLines: PlatformLine[];
    provenance: DataProvenance;
    fallbackReason?: string;
  }>;
}

export interface ProviderRegistry {
  statsProvider: StatsProvider;
  oddsProvider: OddsProvider;
}

export const computeHitRate = (logs: GameLog[], marketType: MarketType): number => {
  const key = mapMarketStatKey(marketType);
  const values = logs
    .map((log) => log.stats[key])
    .filter((value): value is number => typeof value === 'number');
  if (values.length === 0) return 0;
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
};
