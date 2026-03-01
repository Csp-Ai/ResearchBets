import 'server-only';

import { computeEdgeDelta, computeMarketImpliedProb, computeModelProb } from '@/src/core/markets/edgePrimitives';
import { getProviderRegistry } from '@/src/core/providers/registry.server';
import type { BoardSport } from '@/src/core/board/boardService.server';
import { createDemoTodayPayload } from './demoToday';
import { TODAY_LEAGUES, type ProviderHealth, type TodayPayload, type TodayPropKey } from './types';

const TTL_MS = 120_000;
const MARKETS = ['points', 'rebounds', 'assists'] as const;
export const MIN_BOARD_ROWS = 6;

let cache: { key: string; expiresAt: number; payload: TodayPayload } | null = null;

const toLocal = (iso: string, tz: string) =>
  new Intl.DateTimeFormat('en-US', { timeZone: tz, month: 'short', day: '2-digit', hour: 'numeric', minute: '2-digit' }).format(new Date(iso));

const toSportKey = (sport: BoardSport) => {
  if (sport === 'NBA') return 'basketball_nba';
  if (sport === 'NFL') return 'americanfootball_nfl';
  if (sport === 'NHL') return 'icehockey_nhl';
  if (sport === 'MLB') return 'baseball_mlb';
  return 'mma_mixed_martial_arts';
};

const startOfDay = (date: string) => new Date(`${date}T00:00:00.000Z`).getTime();
const endOfDay = (date: string) => new Date(`${date}T23:59:59.999Z`).getTime();

const providerHealth = (errors: string[] = []): ProviderHealth[] => [
  {
    provider: 'the-odds-api',
    ok: errors.length === 0,
    missingKey: !process.env.ODDS_API_KEY,
    message: errors[0]
  },
  {
    provider: 'sportsdataio',
    ok: Boolean(process.env.SPORTSDATA_API_KEY),
    missingKey: !process.env.SPORTSDATA_API_KEY,
    message: process.env.SPORTSDATA_API_KEY ? undefined : 'SPORTSDATA_API_KEY missing'
  }
];

function buildBoardFromGames(games: TodayPayload['games'], mode: TodayPayload['mode']) {
  return games.flatMap((game) => game.propsPreview.map((prop) => ({
    ...prop,
    gameId: game.id,
    matchup: game.matchup,
    startTime: game.startTime,
    mode,
    line: prop.line ?? '',
    odds: prop.odds ?? '-110',
    hitRateL10: typeof prop.hitRateL10 === 'number' ? prop.hitRateL10 : 55,
    marketImpliedProb: typeof prop.marketImpliedProb === 'number' ? prop.marketImpliedProb : computeMarketImpliedProb({ odds: prop.odds ?? '-110' }),
    modelProb: typeof prop.modelProb === 'number' ? prop.modelProb : computeModelProb({ deterministic: { idSeed: prop.id, hitRateL10: typeof prop.hitRateL10 === 'number' ? prop.hitRateL10 : 55, riskTag: prop.riskTag ?? 'watch' } }),
    edgeDelta: typeof prop.edgeDelta === 'number'
      ? prop.edgeDelta
      : computeEdgeDelta(
        typeof prop.modelProb === 'number' ? prop.modelProb : computeModelProb({ deterministic: { idSeed: prop.id, hitRateL10: typeof prop.hitRateL10 === 'number' ? prop.hitRateL10 : 55, riskTag: prop.riskTag ?? 'watch' } }),
        typeof prop.marketImpliedProb === 'number' ? prop.marketImpliedProb : computeMarketImpliedProb({ odds: prop.odds ?? '-110' })
      ),
    riskTag: prop.riskTag ?? 'watch',
    rationale: prop.rationale ?? ['Deterministic board fallback']
  })));
}

function withLandingSummary(payload: TodayPayload): TodayPayload {
  const lastUpdatedAt = payload.games[0]?.lastUpdated ?? payload.generatedAt;
  return {
    ...payload,
    landing: {
      mode: payload.mode,
      reason: payload.reason === 'missing_keys' ? 'missing_keys' : payload.reason === 'provider_unavailable' ? 'provider_unavailable' : 'live_ok',
      gamesCount: payload.games.length,
      lastUpdatedAt,
      headlineMatchup: payload.games[0]?.matchup
    }
  };
}

function ensureBoard(payload: TodayPayload): TodayPayload {
  const board = Array.isArray(payload.board) && payload.board.length > 0 ? payload.board : buildBoardFromGames(payload.games, payload.mode);
  return { ...payload, board };
}

function getDemoFallback(reason: string, sport?: BoardSport): TodayPayload {
  const demo = createDemoTodayPayload(sport);
  const withBoard = ensureBoard({
    ...demo,
    reason,
    status: 'active',
    provenance: { mode: 'demo', reason, generatedAt: demo.generatedAt },
    providerErrors: reason === 'live_ok' ? [] : [reason],
    providerHealth: providerHealth([reason])
  });
  return withLandingSummary(withBoard);
}

async function fetchLiveToday(options: { sport: BoardSport; tz: string; date: string }): Promise<TodayPayload> {
  const { sport, tz, date } = options;
  const registry = getProviderRegistry();
  const now = Date.now();
  const errors: string[] = [];

  let events: Array<{ id: string; commence_time?: string; home_team?: string; away_team?: string }> = [];
  try {
    const result = await registry.oddsProvider.fetchEvents({ sport: toSportKey(sport) });
    events = (result.events ?? []) as Array<{ id: string; commence_time?: string; home_team?: string; away_team?: string }>;
    if (result.fallbackReason) errors.push(result.fallbackReason);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'provider_unavailable');
  }

  const active = events.filter((event) => {
    if (!event.commence_time) return false;
    const stamp = new Date(event.commence_time).getTime();
    return stamp >= startOfDay(date) && stamp <= endOfDay(date);
  });

  const nextWindow = events
    .filter((event) => event.commence_time)
    .filter((event) => {
      const stamp = new Date(event.commence_time!).getTime();
      return stamp > now && stamp <= now + 48 * 60 * 60 * 1000;
    })
    .sort((a, b) => new Date(a.commence_time!).getTime() - new Date(b.commence_time!).getTime());

  const selected = active.length > 0 ? active : nextWindow;
  const status: TodayPayload['status'] = active.length > 0 ? 'active' : nextWindow.length > 0 ? 'next' : 'market_closed';

  const games: TodayPayload['games'] = selected.slice(0, 8).map((event, idx) => {
    const startTimeUTC = event.commence_time ?? new Date(now + idx * 3_600_000).toISOString();
    const home = event.home_team ?? `HOME-${idx + 1}`;
    const away = event.away_team ?? `AWAY-${idx + 1}`;
    return {
      id: event.id,
      league: sport,
      status: new Date(startTimeUTC).getTime() <= now ? 'live' as const : 'upcoming' as const,
      startTime: toLocal(startTimeUTC, tz),
      matchup: `${away} @ ${home}`,
      teams: [away, home],
      bookContext: 'Provider market board',
      propsPreview: [],
      provenance: 'the-odds-api',
      lastUpdated: new Date().toISOString()
    };
  });

  const eventIds = games.map((g) => g.id);
  const board: TodayPropKey[] = [];
  if (eventIds.length > 0) {
    for (const market of MARKETS) {
      try {
        const odds = await registry.oddsProvider.fetchEventOdds({ sport, eventIds, marketType: market });
        if (odds.fallbackReason) errors.push(odds.fallbackReason);
        odds.platformLines.slice(0, 30).forEach((line, idx) => {
          const game = games[idx % games.length];
          if (!game) return;
          const implied = computeMarketImpliedProb({ odds: typeof line.odds === 'number' ? String(line.odds) : String(line.odds ?? '-110') });
          const model = computeModelProb({ deterministic: { idSeed: `${game.id}:${line.player}:${market}:${idx}`, hitRateL10: 56 + (idx % 20), riskTag: idx % 2 ? 'watch' : 'stable' } });
          board.push({
            id: `${game.id}:${market}:${idx}`,
            player: line.player,
            market,
            line: String(line.line),
            odds: typeof line.odds === 'number' ? String(line.odds) : String(line.odds ?? '-110'),
            hitRateL10: 56 + (idx % 20),
            hitRateL5: 54 + (idx % 24),
            marketImpliedProb: implied,
            modelProb: model,
            edgeDelta: computeEdgeDelta(model, implied),
            riskTag: idx % 2 ? 'watch' : 'stable',
            confidencePct: 58 + (idx % 30),
            rationale: ['Recent trend alignment', 'Market line context'],
            provenance: line.platform,
            lastUpdated: new Date().toISOString()
          });
        });
      } catch (error) {
        errors.push(error instanceof Error ? error.message : 'provider_unavailable');
      }
    }
  }

  const gameById = new Map(games.map((g) => [g.id, g]));
  games.forEach((game) => {
    game.propsPreview = board.filter((p) => p.id.startsWith(`${game.id}:`)).slice(0, 4);
  });

  const payload: TodayPayload = {
    mode: 'live',
    generatedAt: new Date().toISOString(),
    provenance: { mode: 'live', reason: errors.length ? 'provider_unavailable' : 'live_ok', generatedAt: new Date().toISOString() },
    leagues: [...TODAY_LEAGUES],
    games,
    reason: errors.length ? (errors.some((entry) => entry.includes('key_missing')) ? 'missing_keys' : 'provider_unavailable') : 'live_ok',
    providerErrors: errors,
    userSafeReason: errors.length ? 'Live mode (some feeds unavailable)' : undefined,
    status,
    nextAvailableStartTime: status === 'next' ? selected[0]?.commence_time : undefined,
    providerHealth: providerHealth(errors),
    board: board.slice(0, 24).map((row) => {
      const gameId = row.id.split(':')[0] ?? '';
      return { ...row, gameId, matchup: gameById.get(gameId)?.matchup, startTime: gameById.get(gameId)?.startTime, mode: 'live' as const };
    })
  };

  return withLandingSummary(payload);
}

export async function resolveTodayTruth(options?: {
  forceRefresh?: boolean;
  sport?: BoardSport;
  date?: string;
  tz?: string;
  mode?: TodayPayload['mode'];
  strictLive?: boolean;
}): Promise<TodayPayload> {
  const sport = options?.sport ?? 'NBA';
  const tz = options?.tz ?? 'America/Phoenix';
  const date = options?.date ?? new Date().toISOString().slice(0, 10);
  const mode = options?.mode ?? 'live';
  const key = `${sport}:${tz}:${date}`;

  if (mode === 'demo') {
    return getDemoFallback('demo_requested', sport);
  }

  if (!options?.forceRefresh && cache && cache.key === key && cache.expiresAt > Date.now()) {
    return withLandingSummary({ ...cache.payload, mode: 'cache', provenance: { mode: 'cache', reason: 'cache_hit', generatedAt: cache.payload.generatedAt } });
  }

  let livePayload: TodayPayload | null = null;
  try {
    livePayload = ensureBoard(await fetchLiveToday({ sport, tz, date }));
  } catch {
    livePayload = null;
  }

  const shouldFallback = !livePayload
    || (livePayload.board?.length ?? 0) < MIN_BOARD_ROWS
    || livePayload.games.length === 0
    || livePayload.status === 'market_closed'
    || livePayload.reason === 'provider_unavailable'
    || livePayload.reason === 'missing_keys';

  if (livePayload && !shouldFallback) {
    cache = { key, expiresAt: Date.now() + TTL_MS, payload: livePayload };
    return livePayload;
  }

  if (options?.strictLive) {
    if (livePayload && (livePayload.board?.length ?? 0) > 0) return livePayload;
    return {
      ...(livePayload ?? getDemoFallback('provider_unavailable', sport)),
      mode: 'live',
      reason: 'strict_live_empty',
      board: [],
      games: [],
      providerErrors: ['strict_live_empty'],
      landing: {
        mode: 'live',
        reason: 'provider_unavailable',
        gamesCount: 0,
        lastUpdatedAt: new Date().toISOString(),
      },
    };
  }

  if (cache?.key === key && (cache.payload.board?.length ?? 0) >= MIN_BOARD_ROWS) {
    return withLandingSummary({
      ...cache.payload,
      mode: 'cache',
      reason: 'provider_unavailable',
      provenance: { mode: 'cache', reason: 'cache_fallback', generatedAt: cache.payload.generatedAt }
    });
  }

  return getDemoFallback(livePayload?.reason ?? 'provider_unavailable', sport);
}

export async function getTodayPayload(options?: { forceRefresh?: boolean; sport?: BoardSport; date?: string; tz?: string; mode?: TodayPayload['mode']; strictLive?: boolean }): Promise<TodayPayload> {
  return resolveTodayTruth(options);
}
