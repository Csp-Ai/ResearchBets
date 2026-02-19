import type { MarketType } from '../../core/markets/marketType';
import { computeHitRate, providerRegistry, type ProviderRegistry } from '../../core/providers/registry';
import { buildProvenance } from '../../core/sources/provenance';
import type { HitProfileResult } from './types';

export interface StatsScoutPreload {
  recentByPlayerId: Record<string, Awaited<ReturnType<ProviderRegistry['statsProvider']['fetchRecentPlayerGameLogs']>>['byPlayerId'][string]>;
  seasonByPlayerId: Awaited<ReturnType<ProviderRegistry['statsProvider']['fetchSeasonPlayerAverages']>>['byPlayerId'];
  provenanceSources: Array<{ provider: string; url: string; retrievedAt: string }>;
  fallbackReason?: string;
}

export const runStatsScout = async (input: {
  sport: string;
  playerId: string;
  marketType: MarketType;
  opponentTeamId?: string;
  preload?: StatsScoutPreload;
}): Promise<HitProfileResult> => {
  const source = input.preload;
  if (!source) {
    const [logs, season] = await Promise.all([
      providerRegistry.statsProvider.fetchRecentPlayerGameLogs({ sport: input.sport, playerIds: [input.playerId], limit: 10 }),
      providerRegistry.statsProvider.fetchSeasonPlayerAverages({ sport: input.sport, playerIds: [input.playerId] })
    ]);
    const recent = logs.byPlayerId[input.playerId] ?? [];
    const seasonAvg = season.byPlayerId[input.playerId]?.averages.points ?? 0;
    return {
      hitProfile: { l5: computeHitRate(recent.slice(0, 5), input.marketType), l10: computeHitRate(recent.slice(0, 10), input.marketType), seasonAvg },
      provenance: buildProvenance([...logs.provenance.sources, ...season.provenance.sources]),
      fallbackReason: logs.fallbackReason ?? season.fallbackReason
    };
  }

  const recentLogs = source.recentByPlayerId[input.playerId] ?? [];
  const season = source.seasonByPlayerId[input.playerId];
  const seasonAvg = season ? computeHitRate([{ playerId: season.playerId, gameDate: new Date().toISOString(), stats: season.averages }], input.marketType) : 0;

  return {
    hitProfile: {
      l5: computeHitRate(recentLogs.slice(0, 5), input.marketType),
      l10: computeHitRate(recentLogs.slice(0, 10), input.marketType),
      seasonAvg
    },
    provenance: buildProvenance(source.provenanceSources),
    fallbackReason: source.fallbackReason
  };
};
