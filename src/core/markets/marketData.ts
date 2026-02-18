import { getGamesByLeague } from '../games/registry';

import { impliedProbabilitiesFromLines } from './impliedProbabilities';

export type MarketSource = 'DEMO' | 'derived' | 'scraped';

interface DemoLine {
  gameId: string;
  homeMoneyline?: number;
  awayMoneyline?: number;
  spread?: number;
  total?: number;
}

const MARKET_TTL_MS = 45_000;
const demoLineByGameId: Record<string, DemoLine> = {
  NFL_DEMO_1: {
    gameId: 'NFL_DEMO_1',
    homeMoneyline: -132,
    awayMoneyline: 118,
    spread: -2.5,
    total: 48.5
  },
  NBA_DEMO_1: {
    gameId: 'NBA_DEMO_1',
    homeMoneyline: -145,
    awayMoneyline: 130,
    spread: -3.5,
    total: 229.5
  },
  NHL_DEMO_1: {
    gameId: 'NHL_DEMO_1',
    homeMoneyline: -118,
    awayMoneyline: 108,
    spread: -1.5,
    total: 6.5
  },
  MLB_DEMO_1: {
    gameId: 'MLB_DEMO_1',
    homeMoneyline: -102,
    awayMoneyline: -102,
    spread: -1.5,
    total: 8.5
  },
  SOCCER_DEMO_1: {
    gameId: 'SOCCER_DEMO_1',
    homeMoneyline: 120,
    awayMoneyline: 205,
    spread: -0.5,
    total: 2.5
  },
  UFC_DEMO_1: { gameId: 'UFC_DEMO_1', homeMoneyline: -175, awayMoneyline: 154 }
};

interface SnapshotCacheValue {
  expiresAt: number;
  value: MarketSnapshot;
}

const snapshotCache = new Map<string, SnapshotCacheValue>();

export interface MarketGame {
  gameId: string;
  sport: string;
  label: string;
  startsAt: string;
  source: MarketSource;
  degraded: boolean;
  homeTeam: string;
  awayTeam: string;
  lines: {
    homeMoneyline?: number;
    awayMoneyline?: number;
    spread?: number;
    total?: number;
  };
  implied: {
    home: number;
    away: number;
    source: 'moneyline' | 'fallback';
  };
}

export interface MarketSnapshot {
  sport: string;
  loadedAt: string;
  source: MarketSource;
  degraded: boolean;
  as_of_iso: string;
  age_ms: number;
  cache_status: 'hit' | 'miss' | 'stale';
  games: MarketGame[];
}

const withFreshness = (
  snapshot: Omit<MarketSnapshot, 'as_of_iso' | 'age_ms' | 'cache_status'>,
  cacheStatus: MarketSnapshot['cache_status'],
  asOfIso?: string
): MarketSnapshot => {
  const timestamp = asOfIso ?? snapshot.loadedAt;
  const ageMs = Math.max(0, Date.now() - Date.parse(timestamp));
  return {
    ...snapshot,
    as_of_iso: timestamp,
    age_ms: ageMs,
    cache_status: cacheStatus
  };
};

const parseTeams = (label: string): { awayTeam: string; homeTeam: string } => {
  const [away = 'Away', home = 'Home'] = label.split('@').map((item) => item.trim());
  return { awayTeam: away, homeTeam: home };
};

const useWebProvider = (): boolean =>
  (process.env.LIVE_MARKETS_WEB_PROVIDER_ENABLED ?? 'false').toLowerCase() === 'true';

async function loadWebSnapshot(_sport: string): Promise<MarketSnapshot | null> {
  if (!useWebProvider()) return null;
  return null;
}

function loadDemoSnapshot(sport: string): MarketSnapshot {
  const games = getGamesByLeague(sport).map((game) => {
    const teams = parseTeams(game.label);
    const line = demoLineByGameId[game.gameId] ?? { gameId: game.gameId };
    const impliedPair = impliedProbabilitiesFromLines({
      homeMoneyline: line.homeMoneyline,
      awayMoneyline: line.awayMoneyline,
      removeVig: true
    });
    return {
      gameId: game.gameId,
      sport: game.league,
      label: game.label,
      startsAt: game.startsAt,
      source: 'DEMO' as const,
      degraded: impliedPair.source === 'fallback',
      homeTeam: teams.homeTeam,
      awayTeam: teams.awayTeam,
      lines: {
        homeMoneyline: line.homeMoneyline,
        awayMoneyline: line.awayMoneyline,
        spread: line.spread,
        total: line.total
      },
      implied: {
        home: impliedPair.home.implied,
        away: impliedPair.away.implied,
        source: impliedPair.source
      }
    } satisfies MarketGame;
  });

  return withFreshness(
    {
      sport,
      loadedAt: new Date().toISOString(),
      source: 'DEMO',
      degraded: games.some((game) => game.degraded),
      games
    },
    'miss'
  );
}

export async function getMarketSnapshot(input: {
  sport: string;
  dateRange?: { start?: string; end?: string };
}): Promise<MarketSnapshot> {
  const cacheKey = `${input.sport.toLowerCase()}:${input.dateRange?.start ?? 'none'}:${input.dateRange?.end ?? 'none'}`;
  const cached = snapshotCache.get(cacheKey);
  if (cached?.expiresAt && cached.expiresAt > Date.now()) {
    return withFreshness(
      {
        ...cached.value,
        source: cached.value.source === 'DEMO' ? 'DEMO' : 'derived'
      },
      'hit',
      cached.value.as_of_iso
    );
  }

  try {
    const webSnapshot = await loadWebSnapshot(input.sport);
    const snapshot = webSnapshot ?? loadDemoSnapshot(input.sport);
    const missSnapshot = withFreshness(snapshot, 'miss');
    snapshotCache.set(cacheKey, { value: missSnapshot, expiresAt: Date.now() + MARKET_TTL_MS });
    return missSnapshot;
  } catch {
    if (!cached) return withFreshness(loadDemoSnapshot(input.sport), 'miss');
    return withFreshness(cached.value, 'stale', cached.value.as_of_iso);
  }
}
