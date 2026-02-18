import {
  getAllGames,
  resolveGameFromRegistry,
  searchGamesInRegistry,
  type CanonicalGame
} from './registry';

export interface GameCatalogItem extends CanonicalGame {}

export const DEMO_GAMES: GameCatalogItem[] = getAllGames();

export function searchGames(query: string): GameCatalogItem[] {
  return searchGamesInRegistry(query);
}

export function resolveGameById(gameId: string): GameCatalogItem | null {
  return resolveGameFromRegistry(gameId);
}
