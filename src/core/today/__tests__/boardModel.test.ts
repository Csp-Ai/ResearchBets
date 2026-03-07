import { describe, expect, it } from 'vitest';

import { buildCanonicalBoard } from '@/src/core/today/boardModel';

describe('buildCanonicalBoard', () => {
  it('deduplicates near-identical rows and keeps strongest candidate', () => {
    const board = buildCanonicalBoard({
      board: [
        {
          id: 'a',
          gameId: 'g1',
          player: 'Luka Doncic',
          market: 'points',
          line: '30.5',
          edgeDelta: 0.03,
          hitRateL10: 55,
          modelProb: 0.54,
          marketImpliedProb: 0.5,
          riskTag: 'watch'
        },
        {
          id: 'b',
          gameId: 'g1',
          player: 'Luka Doncic',
          market: 'points',
          line: '30.5',
          edgeDelta: 0.08,
          hitRateL10: 70,
          modelProb: 0.62,
          marketImpliedProb: 0.51,
          riskTag: 'stable'
        },
        {
          id: 'c',
          gameId: 'g1',
          player: 'Luka Doncic',
          market: 'assists',
          line: '8.5'
        }
      ]
    });

    expect(board).toHaveLength(2);
    expect(board.find((row) => row.market === 'points')?.id).toBe('b');
    expect(board.map((row) => row.id)).toContain('c');
  });
});
