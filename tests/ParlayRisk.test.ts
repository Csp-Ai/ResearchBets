import { describe, expect, it } from 'vitest';

import { getParlayCorrelationScore, summarizeParlayRisk } from '../src/core/parlay/parlayRisk';

describe('parlayRisk', () => {
  it('returns a correlation score with detected correlated pairs', () => {
    const result = getParlayCorrelationScore([
      { selection: 'Tatum over 30.5', market: 'points', team: 'BOS', gameId: 'NBA:BOS@LAL' },
      { selection: 'Brown over 3.5 3PM', market: 'threes', team: 'BOS', gameId: 'NBA:BOS@LAL' },
      { selection: 'LeBron over 8.5 AST', market: 'assists', team: 'LAL', gameId: 'NBA:BOS@LAL' },
    ]);

    expect(result.score).toBeGreaterThan(0);
    expect(['low', 'medium', 'high']).toContain(result.strength);
    expect(result.correlatedPairs.length).toBeGreaterThan(0);
  });

  it('builds an overall parlay variance summary label', () => {
    const summary = summarizeParlayRisk([
      { selection: 'Leg 1', market: 'ra' },
      { selection: 'Leg 2', market: 'pra' },
      { selection: 'Leg 3', market: 'points' },
    ]);

    expect(summary).toContain('3-leg combo');
  });
});
