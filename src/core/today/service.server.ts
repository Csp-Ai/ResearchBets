import 'server-only';

import { computeEdgeDelta, computeMarketImpliedProb, computeModelProb } from '@/src/core/markets/edgePrimitives';
import { getProviderRegistry } from '@/src/core/providers/registry.server';
import type { BoardSport } from '@/src/core/board/boardService.server';
import { ALIAS_KEYS, CANONICAL_KEYS } from '@/src/core/env/keys';
import { resolveWithAliases } from '@/src/core/env/read.server';
import { createDemoTodayPayload } from './demoToday';
import { TODAY_LEAGUES, type ProviderHealth, type TodayLiveStep, type TodayPayload, type TodayPropKey } from './types';
import { computeAttemptMetrics, computeFeaturedBucketAveragesFromLogs, computeMinutesMetrics, deriveDeadLegRisk, deriveRoleConfidence } from './rowIntelligence';

const TTL_MS = 120_000;
const MARKETS = ['pra', 'points', 'rebounds', 'assists', 'threes'] as const;
export const MIN_BOARD_ROWS = 6;

type LiveDiagnostic = {
  step: TodayLiveStep;
  statusCode?: number;
  hint: string;
};

export type CanonicalBoardView = {
  mode: TodayPayload['mode'];
  reason?: TodayPayload['reason'];
  generatedAt: string;
  games: TodayPayload['games'];
  board: NonNullable<TodayPayload['board']>;
  providerErrors?: string[];
  userSafeReason?: string;
};

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

const providerHealth = (
  fatalErrors: string[] = [],
  opts?: { mode?: TodayPayload['mode']; reason?: string },
): ProviderHealth[] => {
  const oddsKey = resolveWithAliases(CANONICAL_KEYS.ODDS_API_KEY, ALIAS_KEYS[CANONICAL_KEYS.ODDS_API_KEY]);
  const sportsDataKey = resolveWithAliases(
    CANONICAL_KEYS.SPORTSDATA_API_KEY,
    ALIAS_KEYS[CANONICAL_KEYS.SPORTSDATA_API_KEY],
  );

  const demoMode = opts?.mode === 'demo';
  const oddsFatal = fatalErrors.filter((entry) => (
    entry.includes('provider_unavailable')
    || entry.includes('provider_events_unavailable')
    || entry.includes('no_games')
    || entry.includes('market_closed')
    || entry.includes('board_too_sparse')
    || entry.includes('strict_live_empty')
    || entry.includes('key_missing')
  ));

  return [
    {
      provider: 'the-odds-api',
      ok: Boolean(oddsKey) && (demoMode || oddsFatal.length === 0),
      missingKey: !oddsKey,
      message: oddsFatal[0],
    },
    {
      provider: 'sportsdataio',
      ok: Boolean(sportsDataKey),
      missingKey: !sportsDataKey,
      message: sportsDataKey ? undefined : 'SPORTSDATA_API_KEY missing (SPORTSDATAIO_API_KEY accepted)',
    },
  ];
};

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
  const boardSize = payload.board?.length ?? 0;
  const viableLive = boardSize >= MIN_BOARD_ROWS && payload.games.length > 0 && payload.status !== 'market_closed';
  const hasFatalErrors = (payload.providerErrors?.length ?? 0) > 0;
  const hasMissingKeys = payload.reason === 'missing_keys' || (payload.providerErrors ?? []).some((entry) => entry.includes('key_missing'));

  let reason: NonNullable<TodayPayload['landing']>['reason'] = 'live_ok';
  if (payload.mode === 'demo') {
    reason = 'demo';
  } else if (hasMissingKeys) {
    reason = 'missing_keys';
  } else if (!viableLive || hasFatalErrors) {
    reason = 'provider_unavailable';
  }

  return {
    ...payload,
    landing: {
      mode: payload.mode,
      reason,
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

function getDemoFallback(reason: string, sport?: BoardSport, extras?: { providerWarnings?: string[]; debug?: TodayPayload['debug'] }): TodayPayload {
  const demo = createDemoTodayPayload(sport);
  const warnings = extras?.providerWarnings ?? (reason ? [reason] : []);
  const withBoard = ensureBoard({
    ...demo,
    reason,
    status: 'active',
    provenance: { mode: 'demo', reason, generatedAt: demo.generatedAt },
    providerErrors: [],
    providerWarnings: warnings,
    debug: extras?.debug,
    providerHealth: providerHealth([], { mode: 'demo', reason })
  });
  return withLandingSummary(withBoard);
}

function getErrorName(error: unknown) {
  return error instanceof Error && error.name ? error.name : 'Error';
}

function getStatusCode(error: unknown): number | undefined {
  if (typeof error === 'object' && error !== null) {
    const status = (error as { status?: unknown; statusCode?: unknown }).status ?? (error as { statusCode?: unknown }).statusCode;
    if (typeof status === 'number' && Number.isFinite(status)) return status;
  }
  return undefined;
}

function sanitizeErrorMessage(error: Error): string {
  const noUrls = error.message.replace(/https?:\/\/\S+/gi, '[redacted-url]');
  const noSecrets = noUrls.replace(/(api[_-]?key\s*[=:]\s*)[^\s,;]+/gi, '$1[redacted]');
  const compact = noSecrets.replace(/\s+/g, ' ').trim();
  return compact.slice(0, 160) || 'unknown_error';
}

function createLiveHardErrorWarning(step: TodayLiveStep, error: unknown): string[] {
  if (!(error instanceof Error)) {
    return [`live_unavailable:non_error_throw:${step}`];
  }
  const statusCode = getStatusCode(error);
  return [
    `live_hard_error:${step}`,
    `live_hard_error_name:${getErrorName(error)}`,
    `live_hard_error_msg:${sanitizeErrorMessage(error)}`,
    `live_hard_error_code:${typeof statusCode === 'number' ? String(statusCode) : 'none'}`,
  ];
}

function createDebug(step: TodayLiveStep, error: unknown, hintOverride?: string): LiveDiagnostic {
  const statusCode = getStatusCode(error);
  return {
    step,
    statusCode,
    hint: hintOverride ?? 'provider_unavailable',
  };
}

function createLiveUnavailableWarning(reason: string): string {
  return `live_unavailable:${reason}`;
}

async function fetchLiveToday(options: { sport: BoardSport; tz: string; date: string }): Promise<TodayPayload> {
  const { sport, tz, date } = options;
  const registry = getProviderRegistry();
  const now = Date.now();
  const warnings: string[] = [];

  let events: Array<{ id: string; commence_time?: string; home_team?: string; away_team?: string }> = [];
  const oddsBoard: TodayPropKey[] = [];
  let enrichedBoard: TodayPropKey[] = [];
  let games: TodayPayload['games'] = [];
  let status: TodayPayload['status'] = 'market_closed';
  let debug: LiveDiagnostic | undefined;

  try {
    const result = await registry.oddsProvider.fetchEvents({ sport: toSportKey(sport) });
    events = (result.events ?? []) as Array<{ id: string; commence_time?: string; home_team?: string; away_team?: string }>;
    if (result.fallbackReason) warnings.push(result.fallbackReason);
  } catch (error) {
    const providerWarnings = createLiveHardErrorWarning('events_fetch', error);
    return getDemoFallback('provider_unavailable', sport, { providerWarnings, debug: createDebug('events_fetch', error, 'provider_unavailable') });
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
  status = active.length > 0 ? 'active' : nextWindow.length > 0 ? 'next' : 'market_closed';

  games = selected.slice(0, 8).map((event, idx) => {
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

  if (games.length > 0) {
    const eventIds = games.map((g) => g.id);
    try {
      for (const market of MARKETS) {
        const odds = await registry.oddsProvider.fetchEventOdds({ sport, eventIds, marketType: market });
        if (odds.fallbackReason) warnings.push(odds.fallbackReason);
        odds.platformLines.slice(0, 30).forEach((line, idx) => {
          const game = games[idx % games.length];
          if (!game) return;
          const implied = computeMarketImpliedProb({ odds: typeof line.odds === 'number' ? String(line.odds) : String(line.odds ?? '-110') });
          const model = computeModelProb({ deterministic: { idSeed: `${game.id}:${line.player}:${market}:${idx}`, hitRateL10: 56 + (idx % 20), riskTag: idx % 2 ? 'watch' : 'stable' } });
          oddsBoard.push({
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
      }
    } catch (error) {
      const statusCode = getStatusCode(error);
      if (statusCode === 429) {
        const cachedPayload = cache?.payload;
        if (cachedPayload && (cachedPayload.board?.length ?? 0) >= MIN_BOARD_ROWS) {
          return withLandingSummary({
            ...cachedPayload,
            mode: 'cache',
            reason: 'provider_unavailable',
            providerWarnings: [...(cachedPayload.providerWarnings ?? []), 'odds_rate_limited'],
            debug: createDebug('odds_fetch', error, 'rate_limited'),
            provenance: { mode: 'cache', reason: 'cache_fallback', generatedAt: cachedPayload.generatedAt }
          });
        }
        return getDemoFallback('provider_unavailable', sport, {
          providerWarnings: ['odds_rate_limited', ...createLiveHardErrorWarning('odds_fetch', error)],
          debug: createDebug('odds_fetch', error, 'rate_limited'),
        });
      }

      if (statusCode === 401 || statusCode === 403) {
        return getDemoFallback('provider_unavailable', sport, {
          providerWarnings: ['odds_plan_restricted_or_key_invalid', ...createLiveHardErrorWarning('odds_fetch', error)],
          debug: createDebug('odds_fetch', error, 'auth_or_plan_restricted'),
        });
      }

      return getDemoFallback('provider_unavailable', sport, {
        providerWarnings: createLiveHardErrorWarning('odds_fetch', error),
        debug: createDebug('odds_fetch', error, 'provider_unavailable'),
      });
    }
  }

  enrichedBoard = oddsBoard;
  if (oddsBoard.length > 0) {
    try {
      const uniquePlayers = [...new Set(oddsBoard.map((row) => row.player).filter(Boolean))];
      const logsResult: { byPlayerId: Record<string, import('@/src/core/providers/sportsdataio').GameLog[]>; fallbackReason?: string } = uniquePlayers.length > 0
        ? await registry.statsProvider.fetchRecentPlayerGameLogs({ sport, playerIds: uniquePlayers, limit: 5 })
        : { byPlayerId: {}, fallbackReason: 'no_players' };

      const sourceMode: 'live' | 'heuristic' = logsResult.fallbackReason ? 'heuristic' : 'live';
      enrichedBoard = oddsBoard.map((row) => {
        const logs = logsResult.byPlayerId[row.player] ?? [];
        const minutes = computeMinutesMetrics(logs);
        const bucket = computeFeaturedBucketAveragesFromLogs(logs, row.market);
        const attempts = computeAttemptMetrics(logs);
        const role = deriveRoleConfidence(minutes.minutesL3Avg);
        const deadLeg = deriveDeadLegRisk({ market: row.market, roleConfidence: role.roleConfidence, odds: row.odds, l5Avg: bucket.l5Avg, threesAttL5Avg: attempts.threesAttL5Avg });
        return {
          ...row,
          minutesL1: minutes.minutesL1,
          minutesL3Avg: minutes.minutesL3Avg,
          l5Avg: bucket.l5Avg ?? Number(((row.hitRateL5 ?? row.hitRateL10 ?? 0) / 10).toFixed(2)),
          l10Avg: bucket.l10Avg,
          threesAttL1: attempts.threesAttL1,
          threesAttL3Avg: attempts.threesAttL3Avg,
          threesAttL5Avg: attempts.threesAttL5Avg,
          fgaL1: attempts.fgaL1,
          fgaL3Avg: attempts.fgaL3Avg,
          fgaL5Avg: attempts.fgaL5Avg,
          l5Source: bucket.provenance === 'live' ? sourceMode : 'heuristic',
          minutesSource: minutes.minutesL3Avg !== undefined ? sourceMode : 'heuristic',
          attemptsSource: attempts.threesAttL5Avg !== undefined || attempts.fgaL5Avg !== undefined ? sourceMode : 'heuristic',
          roleConfidence: role.roleConfidence,
          roleReasons: role.roleReasons,
          deadLegRisk: deadLeg.deadLegRisk,
          deadLegReasons: bucket.provenance === 'heuristic' && bucket.reason ? [...deadLeg.deadLegReasons, bucket.reason] : deadLeg.deadLegReasons
        };
      });
    } catch (error) {
      warnings.push('stats_degraded');
      debug = createDebug('stats_fetch', error, 'stats_unavailable');
    }
  }

  const gameById = new Map(games.map((g) => [g.id, g]));
  try {
    games.forEach((game) => {
      game.propsPreview = enrichedBoard.filter((p) => p.id.startsWith(`${game.id}:`)).slice(0, 4);
    });
  } catch (error) {
    return getDemoFallback('provider_unavailable', sport, {
      providerWarnings: createLiveHardErrorWarning('normalize', error),
      debug: createDebug('normalize', error, 'normalize_failed'),
    });
  }

  let board: NonNullable<TodayPayload['board']> = [];
  try {
    board = enrichedBoard.slice(0, 24).map((row) => {
      const gameId = row.id.split(':')[0] ?? '';
      return { ...row, gameId, matchup: gameById.get(gameId)?.matchup, startTime: gameById.get(gameId)?.startTime, mode: 'live' as const };
    });
  } catch (error) {
    return getDemoFallback('provider_unavailable', sport, {
      providerWarnings: createLiveHardErrorWarning('board_build', error),
      debug: createDebug('board_build', error, 'board_build_failed'),
    });
  }

  try {
    if (events.length === 0 || games.length === 0 || status === 'market_closed' || board.length < MIN_BOARD_ROWS) {
      const hint = events.length === 0
        ? 'provider_events_unavailable'
        : games.length === 0
          ? 'no_games'
          : status === 'market_closed'
            ? 'market_closed'
            : 'board_too_sparse';
      return getDemoFallback('provider_unavailable', sport, {
        providerWarnings: [createLiveUnavailableWarning(hint)],
        debug: { step: 'live_viability', hint },
      });
    }
  } catch (error) {
    return getDemoFallback('provider_unavailable', sport, {
      providerWarnings: createLiveHardErrorWarning('min_row_checks', error),
      debug: createDebug('min_row_checks', error, 'min_row_checks_failed'),
    });
  }

  const payload: TodayPayload = {
    mode: 'live',
    generatedAt: new Date().toISOString(),
    provenance: { mode: 'live', reason: 'live_ok', generatedAt: new Date().toISOString() },
    leagues: [...TODAY_LEAGUES],
    games,
    reason: 'live_ok',
    providerErrors: [],
    providerWarnings: warnings,
    debug,
    userSafeReason: warnings.length ? 'Live mode (some feeds unavailable)' : undefined,
    status,
    nextAvailableStartTime: status === 'next' ? selected[0]?.commence_time : undefined,
    providerHealth: providerHealth([], { mode: 'live' }),
    board,
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
    || livePayload.mode === 'demo'
    || (livePayload.board?.length ?? 0) < MIN_BOARD_ROWS
    || livePayload.games.length === 0
    || livePayload.status === 'market_closed';

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
      providerWarnings: [],
      providerHealth: providerHealth(['strict_live_empty'], { mode: 'live' }),
      landing: {
        mode: 'live',
        reason: 'provider_unavailable',
        gamesCount: 0,
        lastUpdatedAt: new Date().toISOString(),
      },
    };
  }

  if (livePayload?.mode === 'demo') {
    return livePayload;
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

export function selectBoardViewFromToday(payload: TodayPayload): CanonicalBoardView {
  return {
    mode: payload.mode,
    reason: payload.reason,
    generatedAt: payload.generatedAt,
    games: payload.games,
    board: payload.board ?? [],
    providerErrors: payload.providerErrors,
    userSafeReason: payload.userSafeReason
  };
}
