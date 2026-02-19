import 'server-only';

import { createHash } from 'node:crypto';

import type { MarketType } from '../markets/marketType';
import type { GameLog, SeasonAverages, SportsDataIoProvider } from './sportsdataio';
import { createSportsDataIoProvider } from './sportsdataio';
import type { TheOddsApiProvider } from './theoddsapi';
import { createTheOddsApiProvider } from './theoddsapi';
import type { PlatformLine } from '../../agents/live/types';
import { buildProvenance, type DataProvenance } from '../sources/provenance';

const seeded = (seed: string): number => {
  const hex = createHash('sha1').update(seed).digest('hex').slice(0, 8);
  return Number.parseInt(hex, 16);
};

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

const mockStatsProvider = (id: string): StatsProvider => ({
  id,
  async fetchRecentPlayerGameLogs({ playerIds, limit }) {
    const byPlayerId: Record<string, GameLog[]> = {};
    for (const playerId of [...new Set(playerIds)]) {
      const base = seeded(`${id}:logs:${playerId}`);
      const logs: GameLog[] = [];
      for (let idx = 0; idx < limit; idx += 1) {
        logs.push({
          playerId,
          opponentTeamId: `opp-${(base + idx) % 20}`,
          gameDate: new Date(Date.now() - idx * 86400000).toISOString(),
          stats: {
            points: Number((15 + ((base + idx) % 100) / 5).toFixed(1)),
            rebounds: Number((4 + ((base + idx) % 40) / 8).toFixed(1)),
            assists: Number((3 + ((base + idx) % 35) / 9).toFixed(1)),
            threes: Number((1 + ((base + idx) % 20) / 10).toFixed(1))
          }
        });
      }
      byPlayerId[playerId] = logs;
    }

    return {
      byPlayerId,
      provenance: buildProvenance([
        { provider: id, url: `https://data.example.com/${id}/player-gamelogs`, retrievedAt: new Date().toISOString() }
      ])
    };
  },
  async fetchSeasonPlayerAverages({ playerIds }) {
    const byPlayerId: Record<string, SeasonAverages> = {};
    for (const playerId of [...new Set(playerIds)]) {
      const base = seeded(`${id}:season:${playerId}`);
      byPlayerId[playerId] = {
        playerId,
        games: 50,
        averages: {
          points: Number((16 + (base % 140) / 10).toFixed(1)),
          rebounds: Number((4 + (base % 60) / 10).toFixed(1)),
          assists: Number((3 + (base % 70) / 10).toFixed(1)),
          threes: Number((1 + (base % 40) / 20).toFixed(1))
        }
      };
    }

    return {
      byPlayerId,
      provenance: buildProvenance([
        { provider: id, url: `https://data.example.com/${id}/season-averages`, retrievedAt: new Date().toISOString() }
      ])
    };
  },
  async fetchVsOpponentHistory({ playerId, opponentTeamId, limit }) {
    if (!opponentTeamId) return { logs: [], provenance: buildProvenance([]), fallbackReason: 'opponent_unavailable' };
    const { byPlayerId, provenance } = await this.fetchRecentPlayerGameLogs({ sport: 'NBA', playerIds: [playerId], limit: limit * 2 });
    return {
      logs: (byPlayerId[playerId] ?? []).filter((log) => log.opponentTeamId === opponentTeamId).slice(0, limit),
      provenance
    };
  }
});

const mockOddsProvider = (id: string): OddsProvider => ({
  id,
  async fetchEvents() {
    return {
      events: [{ id: 'demo-event-1' }],
      provenance: buildProvenance([
        { provider: id, url: `https://odds.example.com/${id}/events`, retrievedAt: new Date().toISOString() }
      ])
    };
  },
  async fetchEventOdds({ marketType }) {
    const line = 20.5;
    const books = ['fanduel', 'draftkings', 'prizepicks'];
    return {
      platformLines: books.map((book, idx) => ({
        platform: book,
        marketType,
        player: 'demo-player',
        line: line + idx * 0.5,
        odds: -115 + idx * 5,
        asOf: new Date().toISOString(),
        sources: [{ provider: id, url: `https://odds.example.com/${id}/${book}`, retrievedAt: new Date().toISOString() }]
      })),
      provenance: buildProvenance([
        { provider: id, url: `https://odds.example.com/${id}/odds`, retrievedAt: new Date().toISOString() }
      ])
    };
  }
});

export interface ProviderRegistry {
  statsProvider: StatsProvider;
  oddsProvider: OddsProvider;
}

const warn = (code: string, details: Record<string, unknown>) => {
  console.warn(JSON.stringify({ level: 'warn', scope: 'provider_registry', code, ...details }));
};

export const createProviderRegistry = (env: Record<string, string | undefined> = process.env): ProviderRegistry => {
  const hasSportsDataKey = Boolean(env.SPORTSDATAIO_API_KEY);
  const hasOddsKey = Boolean(env.ODDS_API_KEY);

  const statsProvider: StatsProvider = hasSportsDataKey
    ? (createSportsDataIoProvider({ apiKey: env.SPORTSDATAIO_API_KEY, baseUrl: env.SPORTSDATAIO_BASE_URL }) as SportsDataIoProvider)
    : mockStatsProvider('stats-demo');

  const oddsProvider: OddsProvider = hasOddsKey
    ? (createTheOddsApiProvider({ apiKey: env.ODDS_API_KEY, baseUrl: env.ODDS_API_BASE_URL }) as TheOddsApiProvider)
    : mockOddsProvider('odds-demo');

  if (!hasSportsDataKey) warn('stats_provider_fallback', { provider: 'stats-demo', reason: 'SPORTSDATAIO_API_KEY missing' });
  if (!hasOddsKey) warn('odds_provider_fallback', { provider: 'odds-demo', reason: 'ODDS_API_KEY missing' });

  return { statsProvider, oddsProvider };
};

export const providerRegistry: ProviderRegistry = createProviderRegistry();

export const computeHitRate = (logs: GameLog[], marketType: MarketType): number => {
  const key = mapMarketStatKey(marketType);
  const values = logs
    .map((log) => log.stats[key])
    .filter((value): value is number => typeof value === 'number');
  if (values.length === 0) return 0;
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
};
