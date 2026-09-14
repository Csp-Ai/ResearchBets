import 'server-only';

import { ALIAS_KEYS, CANONICAL_KEYS } from '@/src/core/env/keys';
import { resolveWithAliases } from '@/src/core/env/read.server';
import type { LiveCoverageMap, LiveLegUpdate } from '@/src/core/live/openTickets';
import {
  findNflPlayer,
  homeTeamFromGameId,
  isSupportedNflLiveMarket,
  nflClockFromScore,
  playerStatForMarket,
  signedPlayerTeamMargin,
  type SportsDataNflBoxScore,
} from '@/src/core/live/nflLiveNormalizer';
import { fetchJsonWithCache } from '@/src/core/sources/fetchJsonWithCache';
import type { CoverageReason, TrackedTicket } from '@/src/core/track/types';

const SOURCE = 'sportsdataio-live-nfl';
const DEFAULT_BASE_URL = 'https://api.sportsdata.io/v3';
const LIVE_TTL_MS = 12_000;
const TIMEFRAME_TTL_MS = 60_000;
const NFL_TO_LEGACY_PACE_SCALE = 48 / 60;

type CoverageEntry = { coverage: 'covered' | 'missing'; reason?: CoverageReason };

type LiveNflResult = {
  available: boolean;
  updates: Record<string, LiveLegUpdate>;
  coverage: LiveCoverageMap;
  generatedAt: string;
  warnings: string[];
};

const emptyCoverageFor = (
  tickets: TrackedTicket[],
  reason: CoverageReason,
): LiveCoverageMap =>
  Object.fromEntries(
    tickets.map((ticket) => [
      ticket.ticketId,
      {
        coverage: 'none' as const,
        legs: Object.fromEntries(
          ticket.legs.map((leg) => [
            leg.legId,
            {
              coverage: 'missing' as const,
              reason: !leg.gameId && !leg.teams ? ('no_game_id' as const) : reason,
            },
          ]),
        ),
      },
    ]),
  );

const finalizeCoverage = (
  tickets: TrackedTicket[],
  entries: Record<string, Record<string, CoverageEntry>>,
): LiveCoverageMap =>
  Object.fromEntries(
    tickets.map((ticket) => {
      const legs = entries[ticket.ticketId] ?? {};
      const covered = Object.values(legs).filter((entry) => entry.coverage === 'covered').length;
      const total = ticket.legs.length;
      return [
        ticket.ticketId,
        {
          coverage: covered === 0 ? 'none' : covered === total ? 'full' : 'partial',
          legs,
        },
      ];
    }),
  );

const readTimeframe = async <T>(
  baseUrl: string,
  path: string,
  apiKey: string,
): Promise<T> => {
  const response = await fetchJsonWithCache<T>(`${baseUrl}${path}`, {
    source: SOURCE,
    ttlMs: TIMEFRAME_TTL_MS,
    headers: { 'Ocp-Apim-Subscription-Key': apiKey },
    rateLimit: { capacity: 8, refillPerSecond: 3 },
  });
  return response.data;
};

export async function fetchSportsDataNflLiveProgress(
  tickets: TrackedTicket[],
): Promise<LiveNflResult> {
  const generatedAt = new Date().toISOString();
  const apiKey = resolveWithAliases(
    CANONICAL_KEYS.SPORTSDATA_API_KEY,
    ALIAS_KEYS[CANONICAL_KEYS.SPORTSDATA_API_KEY],
  );

  if (!apiKey) {
    return {
      available: false,
      updates: {},
      coverage: emptyCoverageFor(tickets, 'provider_unavailable'),
      generatedAt,
      warnings: ['sportsdataio_api_key_missing'],
    };
  }

  const baseUrl = (process.env.SPORTSDATAIO_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/$/, '');
  let season: string;
  let week: number;
  try {
    const [seasonRaw, weekRaw] = await Promise.all([
      readTimeframe<string | number>(baseUrl, '/nfl/scores/json/CurrentSeason', apiKey),
      readTimeframe<string | number>(baseUrl, '/nfl/scores/json/CurrentWeek', apiKey),
    ]);
    season = String(seasonRaw).trim();
    week = Number(weekRaw);
    if (!season || !Number.isFinite(week)) throw new Error('invalid_timeframe');
  } catch {
    return {
      available: false,
      updates: {},
      coverage: emptyCoverageFor(tickets, 'provider_unavailable'),
      generatedAt,
      warnings: ['sportsdataio_timeframe_unavailable'],
    };
  }

  const entries: Record<string, Record<string, CoverageEntry>> = {};
  const updates: Record<string, LiveLegUpdate> = {};
  const warnings: string[] = [];
  const homeTeams = new Set<string>();

  for (const ticket of tickets) {
    entries[ticket.ticketId] = {};
    for (const leg of ticket.legs) {
      if (leg.league.toUpperCase() !== 'NFL') {
        entries[ticket.ticketId]![leg.legId] = {
          coverage: 'missing',
          reason: 'unsupported_market',
        };
        continue;
      }
      if (!isSupportedNflLiveMarket(leg.marketType)) {
        entries[ticket.ticketId]![leg.legId] = {
          coverage: 'missing',
          reason: 'unsupported_market',
        };
        continue;
      }
      const home = homeTeamFromGameId(leg.gameId ?? leg.teams);
      if (!home) {
        entries[ticket.ticketId]![leg.legId] = {
          coverage: 'missing',
          reason: 'no_game_id',
        };
        continue;
      }
      homeTeams.add(home);
    }
  }

  const boxScores = new Map<string, SportsDataNflBoxScore>();
  await Promise.all(
    [...homeTeams].map(async (home) => {
      try {
        const response = await fetchJsonWithCache<SportsDataNflBoxScore>(
          `${baseUrl}/nfl/stats/json/BoxScoreV3/${encodeURIComponent(season)}/${week}/${encodeURIComponent(home)}`,
          {
            source: SOURCE,
            ttlMs: LIVE_TTL_MS,
            headers: { 'Ocp-Apim-Subscription-Key': apiKey },
            rateLimit: { capacity: 8, refillPerSecond: 3 },
          },
        );
        if (response.data && typeof response.data === 'object') boxScores.set(home, response.data);
      } catch {
        warnings.push(`box_score_unavailable:${home}`);
      }
    }),
  );

  for (const ticket of tickets) {
    for (const leg of ticket.legs) {
      if (entries[ticket.ticketId]?.[leg.legId]) continue;
      if (!isSupportedNflLiveMarket(leg.marketType)) continue;

      const home = homeTeamFromGameId(leg.gameId ?? leg.teams);
      const box = home ? boxScores.get(home) : undefined;
      if (!box) {
        entries[ticket.ticketId]![leg.legId] = {
          coverage: 'missing',
          reason: 'provider_unavailable',
        };
        continue;
      }

      const player = findNflPlayer(box.PlayerGames, leg.player);
      const currentValue = player ? playerStatForMarket(player, leg.marketType) : undefined;
      const clock = nflClockFromScore(box.Score);
      if (!player || currentValue === undefined || !clock) {
        entries[ticket.ticketId]![leg.legId] = {
          coverage: 'missing',
          reason: 'provider_unavailable',
        };
        if (!player) warnings.push(`player_not_found:${leg.player}`);
        continue;
      }

      // `openTickets.ts` still uses a 48-minute legacy pace denominator. Map the
      // real 60-minute NFL elapsed clock onto that scale so projection math stays
      // equivalent until the cross-sport live clock contract is generalized.
      const paceElapsedMinutes = Number(
        (clock.elapsedGameMinutes * NFL_TO_LEGACY_PACE_SCALE).toFixed(2),
      );

      updates[leg.legId] = {
        currentValue,
        liveMargin: signedPlayerTeamMargin(box.Score, player),
        elapsedGameMinutes: paceElapsedMinutes,
        quarter: clock.quarter,
      };
      entries[ticket.ticketId]![leg.legId] = { coverage: 'covered' };
    }
  }

  const coverage = finalizeCoverage(tickets, entries);
  const coveredCount = Object.values(coverage).reduce(
    (sum, ticket) =>
      sum + Object.values(ticket.legs).filter((leg) => leg.coverage === 'covered').length,
    0,
  );

  return {
    available: coveredCount > 0,
    updates,
    coverage,
    generatedAt,
    warnings,
  };
}
