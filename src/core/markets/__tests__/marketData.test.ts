import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getMarketSnapshot } from '../marketData';

describe('market snapshot demo provider', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns deterministic game ids and source tags', async () => {
    const snapshot = await getMarketSnapshot({ sport: 'NFL' });
    expect(snapshot.source).toBe('DEMO');
    expect(snapshot.games[0]?.gameId).toBe('NFL_DEMO_1');
    expect(
      snapshot.games.every((game) => ['DEMO', 'derived', 'scraped'].includes(game.source))
    ).toBe(true);
  });

  it('computes freshness metadata for miss and hit responses', async () => {
    const first = await getMarketSnapshot({ sport: 'NHL' });
    expect(first.cache_status).toBe('miss');
    expect(first.age_ms).toBe(0);
    expect(first.as_of_iso).toBe('2026-01-01T00:00:00.000Z');

    vi.advanceTimersByTime(1_500);

    const second = await getMarketSnapshot({ sport: 'NHL' });
    expect(second.cache_status).toBe('hit');
    expect(second.age_ms).toBe(1_500);
    expect(second.as_of_iso).toBe(first.as_of_iso);
  });
});
