export interface GameCatalogItem {
  gameId: string;
  label: string;
  league: string;
  startsAt: string;
  source: 'live' | 'demo';
}

export const DEMO_GAMES: GameCatalogItem[] = [
  { gameId: 'NFL_DEMO_1', label: 'KC @ BUF', league: 'NFL', startsAt: new Date(Date.now() + 86_400_000).toISOString(), source: 'demo' },
  { gameId: 'NBA_DEMO_1', label: 'LAL @ BOS', league: 'NBA', startsAt: new Date(Date.now() + 43_200_000).toISOString(), source: 'demo' },
  { gameId: 'NHL_DEMO_1', label: 'NYR @ BOS', league: 'NHL', startsAt: new Date(Date.now() + 64_800_000).toISOString(), source: 'demo' },
];

export function searchGames(query: string): GameCatalogItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return DEMO_GAMES;
  const matched = DEMO_GAMES.filter((item) => `${item.gameId} ${item.label} ${item.league}`.toLowerCase().includes(q));
  return matched.length > 0 ? matched : DEMO_GAMES;
}

export function resolveGameById(gameId: string): GameCatalogItem | null {
  return DEMO_GAMES.find((game) => game.gameId === gameId) ?? null;
}
