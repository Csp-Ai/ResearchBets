import 'server-only';

import { ALIAS_KEYS, CANONICAL_KEYS } from '@/src/core/env/keys';
import { resolveWithAliases } from '@/src/core/env/read.server';
import { normalizePlayerKey } from '@/src/core/ideas/playerAvailability';
import {
  computeRecentThresholdForm,
  type NflRecentStatLine,
  type RecentThresholdForm,
} from '@/src/core/ideas/recentForm';
import type { MarketType } from '@/src/core/markets/marketType';
import { fetchJsonWithCache } from '@/src/core/sources/fetchJsonWithCache';

type RecentFormIdea = {
  id: string;
  player: string;
  marketType: MarketType;
  line: number;
};

type PlayerDirectoryRow = Record<string, unknown>;
type PlayerGameRow = Record<string, unknown>;

type PlayerLogs = {
  player: string;
  logs: NflRecentStatLine[];
  season: string;
  asOf: string;
};

const SOURCE_DIRECTORY = 'sportsdataio:nfl-player-directory';
const SOURCE_LOGS = 'sportsdataio:nfl-recent-form';
const DEFAULT_BASE_URL = 'https://api.sportsdata.io/v3';
const DIRECTORY_TTL_MS = 24 * 60 * 60 * 1000;
const LOGS_TTL_MS = 30 * 60 * 1000;

const toNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
};

const asString = (value: unknown): string | undefined => {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return undefined;
};

export const resolveNflSeason = (now = new Date()): string => {
  const configured = process.env.SPORTSDATAIO_SEASON?.trim();
  if (configured) return configured;
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  return String(month >= 7 ? year : year - 1);
};

export const resolveNflSeasonCandidates = (now = new Date()): string[] => {
  const configured = process.env.SPORTSDATAIO_SEASON?.trim();
  if (configured) return [configured];
  const year = resolveNflSeason(now);
  return [year, `${year}REG`];
};

const directoryAliases = (row: PlayerDirectoryRow): string[] => {
  const firstName = asString(row.FirstName);
  const lastName = asString(row.LastName);
  return [
    asString(row.Name),
    firstName && lastName ? `${firstName} ${lastName}` : undefined,
    asString(row.FanDuelName),
    asString(row.DraftKingsName),
    asString(row.YahooName),
  ].filter((value): value is string => Boolean(value));
};

const normalizeGame = (row: PlayerGameRow): NflRecentStatLine | null => {
  const gameDate = asString(row.Day ?? row.Date ?? row.DateTime ?? row.GameDate);
  if (!gameDate) return null;

  const rushingTouchdowns = toNumber(row.RushingTouchdowns) ?? 0;
  const receivingTouchdowns = toNumber(row.ReceivingTouchdowns) ?? 0;
  const hasAnytimeTdFields = row.RushingTouchdowns != null || row.ReceivingTouchdowns != null;

  return {
    gameDate,
    passingYards: toNumber(row.PassingYards),
    passingTouchdowns: toNumber(row.PassingTouchdowns),
    rushingYards: toNumber(row.RushingYards),
    receivingYards: toNumber(row.ReceivingYards),
    receptions: toNumber(row.Receptions),
    carries: toNumber(row.RushingAttempts),
    anytimeTouchdowns: hasAnytimeTdFields ? rushingTouchdowns + receivingTouchdowns : undefined,
  };
};

const fetchPlayerLogs = async (input: {
  baseUrl: string;
  headers: Record<string, string>;
  player: string;
  playerId: string;
  seasonCandidates: string[];
}): Promise<PlayerLogs | null> => {
  for (const season of input.seasonCandidates) {
    try {
      const response = await fetchJsonWithCache<PlayerGameRow[]>(
        `${input.baseUrl}/nfl/stats/json/PlayerGameStatsByPlayer/${encodeURIComponent(season)}/${encodeURIComponent(input.playerId)}`,
        {
          source: SOURCE_LOGS,
          ttlMs: LOGS_TTL_MS,
          headers: input.headers,
          rateLimit: { capacity: 6, refillPerSecond: 2 },
        },
      );
      const logs = (Array.isArray(response.data) ? response.data : [])
        .map(normalizeGame)
        .filter((row): row is NflRecentStatLine => Boolean(row));
      if (logs.length) {
        return {
          player: input.player,
          logs,
          season,
          asOf: response.retrievedAt,
        };
      }
    } catch {
      // Try the next documented/configurable season token form. A failure for
      // one player remains non-blocking for the rest of the slate.
    }
  }
  return null;
};

export async function fetchNflRecentFormForIdeas(ideas: RecentFormIdea[]): Promise<{
  byIdeaId: Record<string, RecentThresholdForm>;
  warning?: string;
}> {
  if (!ideas.length) return { byIdeaId: {} };

  const apiKey = resolveWithAliases(
    CANONICAL_KEYS.SPORTSDATA_API_KEY,
    ALIAS_KEYS[CANONICAL_KEYS.SPORTSDATA_API_KEY],
  );
  if (!apiKey) return { byIdeaId: {}, warning: 'recent_form_provider_key_missing' };

  const baseUrl = (process.env.SPORTSDATAIO_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/$/, '');
  const seasonCandidates = resolveNflSeasonCandidates();
  const headers = { 'Ocp-Apim-Subscription-Key': apiKey };

  try {
    const directoryResponse = await fetchJsonWithCache<PlayerDirectoryRow[]>(
      `${baseUrl}/nfl/scores/json/Players`,
      {
        source: SOURCE_DIRECTORY,
        ttlMs: DIRECTORY_TTL_MS,
        headers,
        rateLimit: { capacity: 2, refillPerSecond: 0.5 },
      },
    );

    const playerIds = new Map<string, string>();
    for (const row of Array.isArray(directoryResponse.data) ? directoryResponse.data : []) {
      const playerId = asString(row.PlayerID);
      if (!playerId) continue;
      for (const alias of directoryAliases(row)) {
        playerIds.set(normalizePlayerKey(alias), playerId);
      }
    }

    const uniquePlayers = [...new Set(ideas.map((idea) => idea.player))];
    const resolvedPlayers = uniquePlayers
      .map((player) => ({ player, playerId: playerIds.get(normalizePlayerKey(player)) }))
      .filter((row): row is { player: string; playerId: string } => Boolean(row.playerId));

    const playerResults = await Promise.all(
      resolvedPlayers.map((row) => fetchPlayerLogs({
        baseUrl,
        headers,
        player: row.player,
        playerId: row.playerId,
        seasonCandidates,
      })),
    );

    const byPlayer = new Map<string, PlayerLogs>();
    for (const result of playerResults) {
      if (!result) continue;
      byPlayer.set(normalizePlayerKey(result.player), result);
    }

    const byIdeaId: Record<string, RecentThresholdForm> = {};
    for (const idea of ideas) {
      const player = byPlayer.get(normalizePlayerKey(idea.player));
      if (!player) continue;
      const form = computeRecentThresholdForm({
        logs: player.logs,
        marketType: idea.marketType,
        threshold: idea.line,
        season: player.season,
        asOf: player.asOf,
      });
      if (form) byIdeaId[idea.id] = form;
    }

    return {
      byIdeaId,
      warning: Object.keys(byIdeaId).length ? undefined : 'recent_form_no_verified_matches',
    };
  } catch {
    return { byIdeaId: {}, warning: 'recent_form_provider_unavailable' };
  }
}
