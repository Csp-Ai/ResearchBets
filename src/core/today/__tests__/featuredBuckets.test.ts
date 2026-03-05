import { describe, expect, it } from 'vitest';

import type { GameLog } from '@/src/core/providers/sportsdataio';
import { computeFeaturedBucketAveragesFromLogs } from '@/src/core/today/rowIntelligence';

const logs: GameLog[] = [
  { playerId: 'p1', gameDate: '2025-01-03', stats: { points: 20, rebounds: 10, assists: 8, threes: 3 } },
  { playerId: 'p1', gameDate: '2025-01-02', stats: { points: 22, rebounds: 7, assists: 6, threes: 2 } },
  { playerId: 'p1', gameDate: '2025-01-01', stats: { points: 18, rebounds: 8, assists: 7, threes: 4 } }
];

describe('computeFeaturedBucketAveragesFromLogs', () => {
  it('computes PRA using per-game sums', () => {
    const result = computeFeaturedBucketAveragesFromLogs(logs, 'pra');
    expect(result.provenance).toBe('live');
    expect(result.l5Avg).toBe(35.33);
  });

  it('returns heuristic provenance when logs missing', () => {
    const result = computeFeaturedBucketAveragesFromLogs([], 'points');
    expect(result.provenance).toBe('heuristic');
    expect(result.reason).toMatch(/No game logs/);
  });
});
