import 'server-only';

import type { MarketType } from '../markets/marketType';
import { fetchJsonWithCache } from '../sources/fetchJsonWithCache';
import { buildProvenance, type DataProvenance } from '../sources/provenance';
import { computeLineConsensus } from './lineConsensus';
import type { LineWatcherResult, PlatformLine } from '../../agents/live/types';

interface TheOddsApiOptions {
  apiKey?: string;
  baseUrl?: string;
}

interface OddsEvent {
  id: string;
  commence_time: string;
  home_team: string;
  away_team: string;
}

interface OddsResponseEvent extends OddsEvent {
  bookmakers?: Array<{
    key: string;
    title: string;
    markets?: Array<{
      key: string;
      outcomes?: Array<{ name: string; point?: number; price?: number }>;
    }>;
  }>;
}

const SOURCE = 'the-odds-api';
const DEFAULT_BASE_URL = 'https://api.the-odds-api.com/v4';

const sportToKey = (sport: string): string => {
  const normalized = sport.toUpperCase();
  if (normalized === 'NBA') return 'basketball_nba';
  if (normalized === 'NFL') return 'americanfootball_nfl';
  return sport.toLowerCase();
};

const marketToOddsApi = (marketType: MarketType): string => {
  switch (marketType) {
    case 'points':
      return 'player_points';
    case 'rebounds':
      return 'player_rebounds';
    case 'assists':
      return 'player_assists';
    case 'threes':
      return 'player_threes';
    default:
      return 'player_points';
  }
};

const toMarketType = (marketKey: string): MarketType | null => {
  switch (marketKey) {
    case 'player_points':
      return 'points';
    case 'player_rebounds':
      return 'rebounds';
    case 'player_assists':
      return 'assists';
    case 'player_threes':
      return 'threes';
    default:
      return null;
  }
};

const parsePlatformLines = (input: {
  events: OddsResponseEvent[];
  marketType: MarketType;
}): PlatformLine[] => {
  const facts: PlatformLine[] = [];
  for (const event of input.events) {
    for (const book of event.bookmakers ?? []) {
      for (const market of book.markets ?? []) {
        const parsedMarketType = toMarketType(market.key);
        if (parsedMarketType !== input.marketType) continue;
        for (const outcome of market.outcomes ?? []) {
          if (typeof outcome.point !== 'number') continue;
          facts.push({
            platform: book.key,
            marketType: parsedMarketType,
            player: outcome.name,
            line: outcome.point,
            odds: typeof outcome.price === 'number' ? outcome.price : undefined,
            asOf: event.commence_time,
            sources: [
              {
                provider: SOURCE,
                url: `https://api.the-odds-api.com/v4/sports/events/${event.id}/odds`,
                retrievedAt: new Date().toISOString()
              }
            ]
          });
        }
      }
    }
  }
  return facts;
};

const ttlForEventSet = (events: OddsEvent[]): number => {
  const now = Date.now();
  const gameDay = events.some((event) => Math.abs(new Date(event.commence_time).getTime() - now) <= 24 * 60 * 60 * 1000);
  return gameDay ? 60_000 : 300_000;
};

export const createTheOddsApiProvider = (options: TheOddsApiOptions = {}) => {
  const apiKey = options.apiKey ?? process.env.ODDS_API_KEY;
  const baseUrl = (options.baseUrl ?? process.env.ODDS_API_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/$/, '');

  return {
    id: SOURCE,
    async fetchEvents(input: { sport: string }): Promise<{ events: OddsEvent[]; provenance: DataProvenance; fallbackReason?: string }> {
      if (!apiKey) {
        return { events: [], provenance: buildProvenance([]), fallbackReason: 'odds_api_key_missing' };
      }

      const sportKey = sportToKey(input.sport);
      const response = await fetchJsonWithCache<OddsEvent[]>(`${baseUrl}/sports/${sportKey}/events`, {
        source: SOURCE,
        ttlMs: 5 * 60 * 1000,
        params: { apiKey },
        rateLimit: { capacity: 10, refillPerSecond: 4 }
      });
      return {
        events: Array.isArray(response.data) ? response.data : [],
        provenance: buildProvenance([{ provider: SOURCE, url: response.url, retrievedAt: response.retrievedAt }])
      };
    },

    async fetchEventOdds(input: {
      sport: string;
      eventIds: string[];
      marketType: MarketType;
    }): Promise<{ platformLines: PlatformLine[]; provenance: DataProvenance; fallbackReason?: string }> {
      if (!apiKey) {
        return { platformLines: [], provenance: buildProvenance([]), fallbackReason: 'odds_api_key_missing' };
      }
      const eventIds = [...new Set(input.eventIds.filter(Boolean))];
      if (eventIds.length === 0) return { platformLines: [], provenance: buildProvenance([]), fallbackReason: 'event_ids_missing' };

      const market = marketToOddsApi(input.marketType);
      const response = await fetchJsonWithCache<OddsResponseEvent[]>(`${baseUrl}/sports/${sportToKey(input.sport)}/odds`, {
        source: SOURCE,
        ttlMs: 5 * 60 * 1000,
        params: {
          apiKey,
          regions: 'us',
          markets: market,
          eventIds: eventIds.join(',')
        },
        rateLimit: { capacity: 10, refillPerSecond: 4 }
      });

      const events = Array.isArray(response.data) ? response.data : [];
      const ttlMs = ttlForEventSet(events);
      const refreshed = await fetchJsonWithCache<OddsResponseEvent[]>(`${baseUrl}/sports/${sportToKey(input.sport)}/odds`, {
        source: SOURCE,
        ttlMs,
        params: {
          apiKey,
          regions: 'us',
          markets: market,
          eventIds: eventIds.join(',')
        },
        rateLimit: { capacity: 10, refillPerSecond: 4 }
      });

      const lines = parsePlatformLines({ events: Array.isArray(refreshed.data) ? refreshed.data : [], marketType: input.marketType });
      return {
        platformLines: lines,
        provenance: buildProvenance([{ provider: SOURCE, url: refreshed.url, retrievedAt: refreshed.retrievedAt }])
      };
    },

    computeConsensus(platformLines: PlatformLine[]): Pick<LineWatcherResult, 'consensusLine' | 'divergence' | 'provenance'> {
      return computeLineConsensus(platformLines);
    }
  };
};

export type TheOddsApiProvider = ReturnType<typeof createTheOddsApiProvider>;
export { parsePlatformLines };
