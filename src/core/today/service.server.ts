import 'server-only';

import { getBoardData, type BoardSport } from '@/src/core/board/boardService.server';

import { computeEdgeDelta, computeMarketImpliedProb, computeModelProb } from '@/src/core/markets/edgePrimitives';
import { TODAY_LEAGUES, type TodayPayload } from './types';

const TTL_MS = 120_000;

let cache: { key: string; expiresAt: number; payload: TodayPayload } | null = null;

const boardSportToLeague = (sport: BoardSport) => sport;

type LandingReason = NonNullable<TodayPayload['landing']>['reason'];

const toLandingReason = (reason: string | undefined): LandingReason => {
  if (reason === 'demo_requested') return 'demo_requested';
  if (reason === 'live_mode_disabled') return 'live_mode_disabled';
  if (reason === 'missing_keys') return 'missing_keys';
  if (reason === 'provider_unavailable') return 'provider_unavailable';
  return 'live_ok';
};

const withLandingSummary = (payload: TodayPayload): TodayPayload => {
  const lastUpdatedAt = payload.games[0]?.lastUpdated ?? payload.generatedAt;
  return {
    ...payload,
    landing: {
      mode: payload.mode === 'live' ? 'live' : 'demo',
      reason: toLandingReason(payload.reason),
      gamesCount: payload.games.length,
      lastUpdatedAt,
      headlineMatchup: payload.games[0]?.matchup
    }
  };
};

export async function getTodayPayload(options?: { forceRefresh?: boolean; demoRequested?: boolean; sport?: BoardSport; date?: string; tz?: string }): Promise<TodayPayload> {
  const sport = options?.sport ?? 'NBA';
  const tz = options?.tz ?? 'America/Phoenix';
  const date = options?.date;
  const key = `${sport}:${tz}:${date ?? 'today'}:${options?.demoRequested ? 'demo' : 'auto'}`;

  if (!options?.forceRefresh && cache && cache.key === key && cache.expiresAt > Date.now()) {
    return withLandingSummary({ ...cache.payload, mode: 'cache' });
  }

  const board = await getBoardData({ sport, tz, date, demoRequested: options?.demoRequested });

  const payload: TodayPayload = {
    mode: board.mode,
    generatedAt: new Date().toISOString(),
    leagues: [...TODAY_LEAGUES],
    games: board.games.map((game) => ({
      id: game.gameId,
      league: boardSportToLeague(game.league),
      status: game.status,
      startTime: game.startTimeLocal,
      matchup: `${game.away} @ ${game.home}`,
      teams: [game.away, game.home],
      bookContext: 'Unified board resolver',
      provenance: board.mode === 'live' ? 'provider registry' : 'deterministic demo fallback',
      lastUpdated: new Date().toISOString(),
      propsPreview: board.scouts.filter((scout) => scout.gameId === game.gameId).map((scout, idx) => {
        const odds = scout.subline;
        const hitRateL10 = Math.max(47, Math.min(78, 54 + scout.reasons.length * 3 - idx));
        const riskTag = hitRateL10 >= 60 ? 'stable' as const : 'watch' as const;
        const marketImpliedProb = computeMarketImpliedProb({ odds });
        const modelProb = computeModelProb({ deterministic: { idSeed: `${game.gameId}:${idx}:${scout.headline}`, hitRateL10, riskTag } });
        return {
          id: `${game.gameId}:prop:${idx}`,
          player: scout.headline.split(' points over ')[0] ?? 'Core Player',
          market: 'points',
          line: scout.headline.split(' points over ')[1] ?? '',
          odds,
          hitRateL10,
          marketImpliedProb,
          modelProb,
          edgeDelta: computeEdgeDelta(modelProb, marketImpliedProb),
          riskTag,
          book_source: 'consensus_demo_book',
          line_variance: 0,
          book_count: 1,
          rationale: scout.reasons,
          provenance: scout.sources.join(' + '),
          lastUpdated: new Date().toISOString()
        };
      })
    })),
    reason: board.reason,
    modeFallbackApplied: board.modeFallbackApplied,
    providerErrors: board.providerErrors,
    userSafeReason: board.userSafeReason
  };

  cache = { key, expiresAt: Date.now() + TTL_MS, payload };
  return withLandingSummary(payload);
}
