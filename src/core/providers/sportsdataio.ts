import 'server-only';

import { fetchJsonWithCache } from '../sources/fetchJsonWithCache';
import { buildProvenance, type DataProvenance, type SourceReference } from '../sources/provenance';

export interface GameLog {
  playerId: string;
  opponentTeamId?: string;
  eventId?: string;
  gameDate: string;
  stats: Partial<Record<'points' | 'rebounds' | 'assists' | 'threes', number>>;
}

export interface SeasonAverages {
  playerId: string;
  games: number;
  averages: Partial<Record<'points' | 'rebounds' | 'assists' | 'threes', number>>;
}

interface SportsDataIoOptions {
  apiKey?: string;
  baseUrl?: string;
}

const DEFAULT_BASE_URL = 'https://api.sportsdata.io/v3';
const SOURCE = 'sportsdataio';

const LOGS_TTL_MS = 6 * 60 * 60 * 1000;
const SEASON_TTL_MS = 24 * 60 * 60 * 1000;
const VS_OPP_TTL_MS = 24 * 60 * 60 * 1000;

const MARKET_KEYS = ['points', 'rebounds', 'assists', 'threes'] as const;

const normalizeSport = (sport: string): string => {
  const normalized = sport.trim().toUpperCase();
  if (normalized === 'NBA') return 'nba';
  if (normalized === 'NFL') return 'nfl';
  return normalized.toLowerCase();
};

const toNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
};

const normalizeLog = (row: Record<string, unknown>, playerIdHint?: string): GameLog | null => {
  const playerId = String(row.PlayerID ?? row.playerId ?? row.playerid ?? playerIdHint ?? '').trim();
  const gameDate = String(row.Day ?? row.gameDate ?? row.DateTime ?? row.date ?? '').trim();
  if (!playerId || !gameDate) return null;

  const stats: GameLog['stats'] = {};
  const points = toNumber(row.Points ?? row.points ?? row.PTS ?? row.FantasyPointsDraftKings);
  const rebounds = toNumber(row.Rebounds ?? row.rebounds ?? row.REB);
  const assists = toNumber(row.Assists ?? row.assists ?? row.AST);
  const threes = toNumber(row.ThreePointersMade ?? row.threes ?? row['3PM']);

  if (points !== undefined) stats.points = points;
  if (rebounds !== undefined) stats.rebounds = rebounds;
  if (assists !== undefined) stats.assists = assists;
  if (threes !== undefined) stats.threes = threes;

  return {
    playerId,
    opponentTeamId: String(row.OpponentID ?? row.opponentTeamId ?? '').trim() || undefined,
    eventId: String(row.GameID ?? row.eventId ?? '').trim() || undefined,
    gameDate,
    stats
  };
};

const normalizeSeason = (row: Record<string, unknown>): SeasonAverages | null => {
  const playerId = String(row.PlayerID ?? row.playerId ?? '').trim();
  if (!playerId) return null;

  const stats: SeasonAverages['averages'] = {};
  const points = toNumber(row.Points ?? row.points ?? row.AveragePoints);
  const rebounds = toNumber(row.Rebounds ?? row.rebounds ?? row.AverageRebounds);
  const assists = toNumber(row.Assists ?? row.assists ?? row.AverageAssists);
  const threes = toNumber(row.ThreePointersMade ?? row.threes ?? row.AverageThreePointersMade);
  if (points !== undefined) stats.points = points;
  if (rebounds !== undefined) stats.rebounds = rebounds;
  if (assists !== undefined) stats.assists = assists;
  if (threes !== undefined) stats.threes = threes;

  return {
    playerId,
    games: toNumber(row.Games ?? row.games ?? row.Played) ?? 0,
    averages: stats
  };
};

const chunk = <T>(values: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < values.length; i += size) chunks.push(values.slice(i, i + size));
  return chunks;
};

const dedupeAndSortLogs = (logs: GameLog[], limit?: number): GameLog[] => {
  const sorted = logs.sort((a, b) => new Date(b.gameDate).getTime() - new Date(a.gameDate).getTime());
  if (!limit) return sorted;
  return sorted.slice(0, limit);
};

export const createSportsDataIoProvider = (options: SportsDataIoOptions = {}) => {
  const apiKey = options.apiKey ?? process.env.SPORTSDATAIO_API_KEY;
  const baseUrl = (options.baseUrl ?? process.env.SPORTSDATAIO_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/$/, '');

  const fetchPlayerLogs = async (
    sport: string,
    playerId: string,
    ttlMs: number
  ): Promise<{ logs: GameLog[]; source?: SourceReference }> => {
    const normalizedSport = normalizeSport(sport);
    const url = `${baseUrl}/${normalizedSport}/stats/json/PlayerGameStatsByPlayer/2024/${encodeURIComponent(playerId)}`;
    const response = await fetchJsonWithCache<Record<string, unknown>[]>(url, {
      source: SOURCE,
      ttlMs,
      headers: { 'Ocp-Apim-Subscription-Key': apiKey ?? '' },
      rateLimit: { capacity: 6, refillPerSecond: 2 }
    });

    const rows = Array.isArray(response.data) ? response.data : [];
    return {
      logs: rows.map((row) => normalizeLog(row, playerId)).filter((row): row is GameLog => Boolean(row)),
      source: { provider: SOURCE, url: response.url, retrievedAt: response.retrievedAt }
    };
  };

  const unavailable = <T>(fallbackReason: string, extra: T): T & { provenance: DataProvenance; fallbackReason: string } => ({
    ...extra,
    provenance: buildProvenance([]),
    fallbackReason
  });

  return {
    id: SOURCE,
    async fetchRecentPlayerGameLogs(input: {
      sport: string;
      playerIds: string[];
      limit: number;
    }): Promise<{ byPlayerId: Record<string, GameLog[]>; provenance: DataProvenance; fallbackReason?: string }> {
      if (!apiKey) return unavailable('sportsdataio_api_key_missing', { byPlayerId: {} });
      const ids = [...new Set(input.playerIds.filter(Boolean))];
      const byPlayerId: Record<string, GameLog[]> = {};
      const sources: SourceReference[] = [];

      const groups = chunk(ids, 10);
      for (const group of groups) {
        const rows = await Promise.all(group.map((playerId) => fetchPlayerLogs(input.sport, playerId, LOGS_TTL_MS)));
        for (const row of rows) {
          if (row.source) sources.push(row.source);
          const playerId = row.logs[0]?.playerId;
          if (playerId) byPlayerId[playerId] = dedupeAndSortLogs(row.logs, input.limit);
        }
      }

      return { byPlayerId, provenance: buildProvenance(sources) };
    },

    async fetchSeasonPlayerAverages(input: {
      sport: string;
      playerIds: string[];
    }): Promise<{ byPlayerId: Record<string, SeasonAverages>; provenance: DataProvenance; fallbackReason?: string }> {
      if (!apiKey) return unavailable('sportsdataio_api_key_missing', { byPlayerId: {} });
      const normalizedSport = normalizeSport(input.sport);
      const url = `${baseUrl}/${normalizedSport}/stats/json/PlayerSeasonStats/2024`;
      const response = await fetchJsonWithCache<Record<string, unknown>[]>(url, {
        source: SOURCE,
        ttlMs: SEASON_TTL_MS,
        headers: { 'Ocp-Apim-Subscription-Key': apiKey },
        rateLimit: { capacity: 4, refillPerSecond: 1 }
      });

      const wanted = new Set(input.playerIds);
      const byPlayerId: Record<string, SeasonAverages> = {};
      for (const row of Array.isArray(response.data) ? response.data : []) {
        const normalized = normalizeSeason(row);
        if (!normalized || !wanted.has(normalized.playerId)) continue;
        byPlayerId[normalized.playerId] = normalized;
      }

      return {
        byPlayerId,
        provenance: buildProvenance([{ provider: SOURCE, url: response.url, retrievedAt: response.retrievedAt }])
      };
    },

    async fetchVsOpponentHistory(input: {
      sport: string;
      playerId: string;
      opponentTeamId?: string;
      limit: number;
    }): Promise<{ logs: GameLog[]; provenance: DataProvenance; fallbackReason?: string }> {
      if (!apiKey) return unavailable('sportsdataio_api_key_missing', { logs: [] });
      if (!input.opponentTeamId) return unavailable('opponent_unavailable', { logs: [] });

      const { logs, source } = await fetchPlayerLogs(input.sport, input.playerId, VS_OPP_TTL_MS);
      const filtered = dedupeAndSortLogs(
        logs.filter((log) => log.opponentTeamId === input.opponentTeamId),
        input.limit
      );
      return {
        logs: filtered,
        provenance: buildProvenance(source ? [source] : [])
      };
    },

    summarize(logs: GameLog[]): Partial<Record<(typeof MARKET_KEYS)[number], number>> {
      if (logs.length === 0) return {};
      const sums: Record<(typeof MARKET_KEYS)[number], number> = {
        points: 0,
        rebounds: 0,
        assists: 0,
        threes: 0
      };
      const counts: Record<(typeof MARKET_KEYS)[number], number> = {
        points: 0,
        rebounds: 0,
        assists: 0,
        threes: 0
      };
      for (const log of logs) {
        for (const key of MARKET_KEYS) {
          const value = log.stats[key];
          if (typeof value === 'number') {
            sums[key] += value;
            counts[key] += 1;
          }
        }
      }

      return MARKET_KEYS.reduce<Partial<Record<(typeof MARKET_KEYS)[number], number>>>((acc, key) => {
        if (counts[key] > 0) acc[key] = Number((sums[key] / counts[key]).toFixed(2));
        return acc;
      }, {});
    }
  };
};

export type SportsDataIoProvider = ReturnType<typeof createSportsDataIoProvider>;
