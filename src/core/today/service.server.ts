import 'server-only';

import { createHash } from 'node:crypto';

import { getProviderRegistry } from '@/src/core/providers/registry.server';

import { createDemoTodayPayload } from './demoToday';
import { TODAY_LEAGUES, type TodayGame, type TodayPayload } from './types';

const TTL_MS = 120_000;

let cache: { key: string; expiresAt: number; payload: TodayPayload } | null = null;

const sportByLeague: Record<(typeof TODAY_LEAGUES)[number], string> = {
  NBA: 'NBA',
  NFL: 'americanfootball_nfl',
  MLB: 'baseball_mlb',
  Soccer: 'soccer_epl',
  UFC: 'mma_mixed_martial_arts',
  NHL: 'icehockey_nhl'
};

const seedNumber = (seed: string) => Number.parseInt(createHash('sha1').update(seed).digest('hex').slice(0, 8), 16);

const toIso = (input: string | undefined) => {
  if (!input) return new Date().toISOString();
  const date = new Date(input);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
};

const buildDemoReasons = (seed: string) => {
  const variants = [
    ['Recent role trend up', 'Opponent profile boosts this market'],
    ['Line still under season baseline', 'Usage projection remains stable'],
    ['Game script favors volume', 'Market not fully adjusted yet']
  ];
  return variants[seedNumber(seed) % variants.length] ?? variants[0];
};

const deriveLiveGame = (league: (typeof TODAY_LEAGUES)[number], index: number, event: { id: string; home_team?: string; away_team?: string; commence_time?: string }): TodayGame => {
  const nowIso = new Date().toISOString();
  const home = event.home_team ?? `HOME-${index + 1}`;
  const away = event.away_team ?? `AWAY-${index + 1}`;
  const baseSeed = `${league}:${event.id}:${home}:${away}`;
  const topPlayers = ['Primary Star', 'Creator', 'Volume Scorer', 'Secondary Engine'];
  return {
    id: `${league}-${event.id}`,
    league,
    status: index === 0 ? 'live' : 'upcoming',
    startTime: index === 0 ? 'LIVE' : new Date(toIso(event.commence_time)).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
    matchup: `${away} @ ${home}`,
    teams: [away, home],
    bookContext: index % 2 === 0 ? 'FanDuel-style' : 'PrizePicks-style',
    provenance: 'odds provider aggregate',
    lastUpdated: nowIso,
    propsPreview: topPlayers.map((player, rowIdx) => ({
      id: `${baseSeed}:prop:${rowIdx}`,
      player,
      market: rowIdx % 4 === 0 ? 'points' : rowIdx % 4 === 1 ? 'assists' : rowIdx % 4 === 2 ? 'rebounds' : 'pra',
      line: `${19.5 + ((seedNumber(baseSeed) + rowIdx) % 13)}`,
      odds: rowIdx % 2 === 0 ? '-110' : '+100',
      rationale: buildDemoReasons(`${baseSeed}:${rowIdx}`) ?? [],
      provenance: 'provider + model prior',
      lastUpdated: nowIso
    }))
  };
};

async function fetchLiveToday(): Promise<TodayPayload> {
  const registry = getProviderRegistry();
  const games: TodayGame[] = [];

  for (const league of TODAY_LEAGUES) {
    const live = await registry.oddsProvider.fetchEvents({ sport: sportByLeague[league] });
    const leagueEvents = live.events.slice(0, 1);
    games.push(...leagueEvents.map((event, index) => deriveLiveGame(league, index, event)));
  }

  if (games.length === 0) {
    throw new Error('no_live_games');
  }

  return {
    mode: 'live',
    generatedAt: new Date().toISOString(),
    leagues: [...TODAY_LEAGUES],
    games
  };
}

const detectMissingProviderKeys = () => {
  return !process.env.THEODDSAPI_KEY && !process.env.ODDS_API_KEY && !process.env.SPORTSDATA_API_KEY;
};

type LandingReason = NonNullable<TodayPayload['landing']>['reason'];

const toLandingReason = (
  mode: TodayPayload['mode'],
  reason: string | undefined,
  liveMode: boolean
): LandingReason => {
  if (!liveMode) return 'live_mode_disabled';
  if (mode === 'live') return 'unknown';
  if (reason === 'demo_requested') return 'demo_requested';
  if (reason === 'missing_provider_keys' || detectMissingProviderKeys()) return 'missing_provider_keys';
  if (reason && reason !== 'live_unavailable') return 'provider_error';
  return 'unknown';
};

const withLandingSummary = (payload: TodayPayload, liveMode: boolean): TodayPayload => {
  const lastUpdatedAt = payload.games[0]?.lastUpdated ?? payload.generatedAt;
  return {
    ...payload,
    landing: {
      mode: payload.mode === 'live' ? 'live' : 'demo',
      reason: toLandingReason(payload.mode, payload.reason, liveMode),
      gamesCount: payload.games.length,
      lastUpdatedAt,
      headlineMatchup: payload.games[0]?.matchup
    }
  };
};

export async function getTodayPayload(options?: { forceRefresh?: boolean; demoRequested?: boolean }): Promise<TodayPayload> {
  const liveMode = (process.env.LIVE_MODE ?? 'false').toLowerCase() === 'true';
  const cacheKey = liveMode && !options?.demoRequested ? 'live' : 'demo';

  if (!options?.forceRefresh && cache && cache.key === cacheKey && cache.expiresAt > Date.now()) {
    return withLandingSummary({
      ...cache.payload,
      mode: 'cache'
    }, liveMode);
  }

  let payload: TodayPayload;

  if (options?.demoRequested) {
    payload = createDemoTodayPayload();
    payload.generatedAt = new Date().toISOString();
    payload.reason = 'demo_requested';
  } else if (!liveMode) {
    payload = createDemoTodayPayload();
    payload.generatedAt = new Date().toISOString();
    payload.reason = 'live_mode_disabled';
  } else {
    if (detectMissingProviderKeys()) {
      payload = createDemoTodayPayload();
      payload.generatedAt = new Date().toISOString();
      payload.mode = 'demo';
      payload.reason = 'missing_provider_keys';
      cache = { key: cacheKey, expiresAt: Date.now() + TTL_MS, payload };
      return withLandingSummary(payload, liveMode);
    }

    try {
      payload = await fetchLiveToday();
    } catch (error) {
      payload = createDemoTodayPayload();
      payload.generatedAt = new Date().toISOString();
      payload.mode = 'demo';
      payload.reason = error instanceof Error ? 'provider_error' : 'unknown';
    }
  }

  cache = { key: cacheKey, expiresAt: Date.now() + TTL_MS, payload };
  return withLandingSummary(payload, liveMode);
}
