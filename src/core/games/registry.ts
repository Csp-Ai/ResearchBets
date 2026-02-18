export interface CanonicalGame {
  gameId: string;
  label: string;
  league: string;
  startsAt: string;
  source: 'live' | 'demo';
}

const canonicalGameSeed: Array<Omit<CanonicalGame, 'startsAt'>> = [
  { gameId: 'NFL_DEMO_1', label: 'KC @ BUF', league: 'NFL', source: 'demo' },
  { gameId: 'NBA_DEMO_1', label: 'LAL @ BOS', league: 'NBA', source: 'demo' },
  { gameId: 'NHL_DEMO_1', label: 'NYR @ BOS', league: 'NHL', source: 'demo' },
  { gameId: 'MLB_DEMO_1', label: 'LAD @ ATL', league: 'MLB', source: 'demo' },
  { gameId: 'SOCCER_DEMO_1', label: 'ARS @ MCI', league: 'Soccer', source: 'demo' },
  { gameId: 'UFC_DEMO_1', label: 'Pereira vs Aspinall', league: 'UFC', source: 'demo' }
];

const startsInHoursByGameId: Record<string, number> = {
  NFL_DEMO_1: 24,
  NBA_DEMO_1: 12,
  NHL_DEMO_1: 18,
  MLB_DEMO_1: 6,
  SOCCER_DEMO_1: 8,
  UFC_DEMO_1: 14
};

export const CANONICAL_GAMES: CanonicalGame[] = canonicalGameSeed.map((game) => ({
  ...game,
  startsAt: new Date(Date.now() + (startsInHoursByGameId[game.gameId] ?? 24) * 3_600_000).toISOString()
}));

const gameById = new Map(CANONICAL_GAMES.map((game) => [game.gameId, game]));

export function getAllGames(): CanonicalGame[] {
  return CANONICAL_GAMES;
}

export function getGamesByLeague(league: string): CanonicalGame[] {
  return CANONICAL_GAMES.filter((game) => game.league.toLowerCase() === league.toLowerCase());
}

export function searchGamesInRegistry(query: string): CanonicalGame[] {
  const q = query.trim().toLowerCase();
  if (!q) return CANONICAL_GAMES;

  const matched = CANONICAL_GAMES.filter((game) =>
    `${game.gameId} ${game.label} ${game.league}`.toLowerCase().includes(q)
  );

  return matched.length > 0 ? matched : CANONICAL_GAMES;
}

export function resolveGameFromRegistry(gameId: string): CanonicalGame | null {
  return gameById.get(gameId) ?? null;
}
