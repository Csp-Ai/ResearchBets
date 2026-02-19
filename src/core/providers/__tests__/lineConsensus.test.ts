import { describe, expect, it } from 'vitest';

import { computeLineConsensus } from '../lineConsensus';

describe('computeLineConsensus', () => {
  it('normalizes platform lines into deterministic consensus/divergence', () => {
    const result = computeLineConsensus([
      {
        platform: 'FanDuel',
        marketType: 'points',
        player: 'A',
        line: 24.5,
        asOf: '2024-01-01T00:00:00.000Z',
        sources: [{ provider: 'FanDuel', url: 'https://a', retrievedAt: '2024-01-01T00:00:00.000Z' }]
      },
      {
        platform: 'PrizePicks',
        marketType: 'points',
        player: 'A',
        line: 26,
        asOf: '2024-01-01T00:00:00.000Z',
        sources: [{ provider: 'PrizePicks', url: 'https://b', retrievedAt: '2024-01-01T00:00:00.000Z' }]
      },
      {
        platform: 'Kalshi',
        marketType: 'points',
        player: 'A',
        line: 25,
        asOf: '2024-01-01T00:00:00.000Z',
        sources: [{ provider: 'Kalshi', url: 'https://c', retrievedAt: '2024-01-01T00:00:00.000Z' }]
      }
    ]);

    expect(result.consensusLine).toBe(25.17);
    expect(result.divergence.spread).toBe(1.5);
    expect(result.divergence.warning).toBe(true);
    expect(result.divergence.bestLine?.platform).toBe('FanDuel');
    expect(result.divergence.worstLine?.platform).toBe('PrizePicks');
  });
});
