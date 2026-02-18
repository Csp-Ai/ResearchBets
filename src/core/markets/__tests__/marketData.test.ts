import { describe, expect, it } from 'vitest';

import { getMarketSnapshot } from '../marketData';

describe('market snapshot demo provider', () => {
  it('returns deterministic game ids and source tags', async () => {
    const snapshot = await getMarketSnapshot({ sport: 'NFL' });
    expect(snapshot.source).toBe('DEMO');
    expect(snapshot.games[0]?.gameId).toBe('NFL_DEMO_1');
    expect(
      snapshot.games.every((game) => ['DEMO', 'derived', 'scraped'].includes(game.source))
    ).toBe(true);
  });
});
