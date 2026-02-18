import { describe, expect, it } from 'vitest';

import {
  getAllGames,
  resolveGameFromRegistry,
  searchGamesInRegistry
} from '../src/core/games/registry';
import { getMarketSnapshot } from '../src/core/markets/marketData';

describe('canonical game registry parity', () => {
  it('search only returns ids resolvable by detail lookup', () => {
    const searchRows = searchGamesInRegistry('demo');
    const ids = searchRows.map((game) => game.gameId);

    expect(ids.length).toBeGreaterThan(0);

    for (const id of ids) {
      expect(resolveGameFromRegistry(id)?.gameId).toBe(id);
    }
  });

  it('live list ids are resolvable by detail lookup', async () => {
    const sports = [...new Set(getAllGames().map((game) => game.league))];

    for (const sport of sports) {
      const snapshot = await getMarketSnapshot({ sport });
      for (const game of snapshot.games) {
        expect(resolveGameFromRegistry(game.gameId)?.gameId).toBe(game.gameId);
      }
    }
  });
});
