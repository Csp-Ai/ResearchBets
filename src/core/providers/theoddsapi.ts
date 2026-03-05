import 'server-only';

import { ALIAS_KEYS, CANONICAL_KEYS } from '@/src/core/env/keys';
import { readString, resolveWithAliases } from '@/src/core/env/read.server';

import type { MarketType } from '../markets/marketType';
import { buildProvenance, type DataProvenance } from '../sources/provenance';
import { computeLineConsensus } from './lineConsensus';
import type { LineWatcherResult, PlatformLine } from '../../agents/live/types';

export type ProviderHttpError = Error & {
  status?: number;
  statusCode?: number;
  url?: string;
  provider?: string;
  host?: string;
  bodyExcerpt?: string;
  cause?: unknown;
};

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
export const DEFAULT_ODDS_API_BASE_URL = 'https://api.the-odds-api.com/v4';

export const resolveOddsApiBaseUrl = (baseUrlOverride?: string | null): string =>
  (baseUrlOverride ?? readString(CANONICAL_KEYS.ODDS_API_BASE_URL) ?? DEFAULT_ODDS_API_BASE_URL).replace(/\/$/, '');

export const sportToKey = (sport: string): string => {
  const normalized = sport.toUpperCase();
  if (normalized === 'NBA') return 'basketball_nba';
  if (normalized === 'NFL') return 'americanfootball_nfl';
  return sport.toLowerCase();
};

export const buildOddsEventsUrl = (input: { baseUrl: string; sport: string; apiKey: string }): string => {
  const url = new URL(`${input.baseUrl.replace(/\/+$/, '')}/sports/${sportToKey(input.sport)}/events`);
  url.searchParams.set('apiKey', input.apiKey);
  return url.toString();
};

const sanitizeBody = (value: string): string =>
  value
    .replace(/api[_-]?key\s*[=:]\s*[^\s,&]+/gi, 'apiKey=[redacted]')
    .replace(/([?&]apiKey=)[^&\s]+/gi, '$1[redacted]')
    .replace(/\s+/g, ' ')
    .trim();

const excerptBody = (value: string): string => sanitizeBody(value).slice(0, 500);

const toProviderHttpError = (input: { status: number; url: string; bodyText: string; cause?: unknown }): ProviderHttpError => {
  const error = new Error(`odds_http_${input.status}`) as ProviderHttpError;
  error.status = input.status;
  error.statusCode = input.status;
  error.url = input.url;
  error.provider = SOURCE;
  error.host = new URL(input.url).host;
  error.bodyExcerpt = excerptBody(input.bodyText);
  if (input.cause !== undefined) error.cause = input.cause;
  return error;
};

export const fetchJsonOrThrow = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, init);
  const text = await response.text();
  if (!response.ok) {
    throw toProviderHttpError({ status: response.status, url, bodyText: text });
  }
  return (text ? JSON.parse(text) : []) as T;
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


export const createTheOddsApiProvider = (options: TheOddsApiOptions = {}) => {
  const apiKey = options.apiKey ?? resolveWithAliases(CANONICAL_KEYS.ODDS_API_KEY, ALIAS_KEYS[CANONICAL_KEYS.ODDS_API_KEY]);
  const baseUrl = resolveOddsApiBaseUrl(options.baseUrl);

  return {
    id: SOURCE,
    async fetchEvents(input: { sport: string }): Promise<{ events: OddsEvent[]; provenance: DataProvenance; fallbackReason?: string }> {
      if (!apiKey) {
        return { events: [], provenance: buildProvenance([]), fallbackReason: 'odds_api_key_missing' };
      }

      const sportKey = sportToKey(input.sport);
      const url = new URL(`${baseUrl}/sports/${sportKey}/events`);
      url.searchParams.set('apiKey', apiKey);
      const events = await fetchJsonOrThrow<OddsEvent[]>(url.toString());
      return {
        events: Array.isArray(events) ? events : [],
        provenance: buildProvenance([{ provider: SOURCE, url: url.toString(), retrievedAt: new Date().toISOString() }])
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
      const refreshedUrl = new URL(`${baseUrl}/sports/${sportToKey(input.sport)}/odds`);
      refreshedUrl.searchParams.set('apiKey', apiKey);
      refreshedUrl.searchParams.set('regions', 'us');
      refreshedUrl.searchParams.set('markets', market);
      refreshedUrl.searchParams.set('eventIds', eventIds.join(','));
      const refreshed = await fetchJsonOrThrow<OddsResponseEvent[]>(refreshedUrl.toString());

      const lines = parsePlatformLines({ events: Array.isArray(refreshed) ? refreshed : [], marketType: input.marketType });
      return {
        platformLines: lines,
        provenance: buildProvenance([{ provider: SOURCE, url: refreshedUrl.toString(), retrievedAt: new Date().toISOString() }])
      };
    },

    computeConsensus(platformLines: PlatformLine[]): Pick<LineWatcherResult, 'consensusLine' | 'divergence' | 'provenance'> {
      return computeLineConsensus(platformLines);
    }
  };
};

export type TheOddsApiProvider = ReturnType<typeof createTheOddsApiProvider>;
export { parsePlatformLines };
