import { describe, expect, it } from 'vitest';

import { rankPropRecommendations } from '../propScout.server';

describe('rankPropRecommendations', () => {
  it('ranks by edge delta and l10 weight deterministically', () => {
    const ranked = rankPropRecommendations([
      { id: 'a', gameId: 'g1', player: 'A', market: 'points', marketImpliedProb: 0.5, modelProb: 0.6, edgeDelta: 0.1, l10: 0.55, volatility: 'low', riskTag: 'stable', reasoning: 'x' },
      { id: 'b', gameId: 'g1', player: 'B', market: 'points', marketImpliedProb: 0.5, modelProb: 0.58, edgeDelta: 0.08, l10: 0.8, volatility: 'low', riskTag: 'stable', reasoning: 'x' },
      { id: 'c', gameId: 'g1', player: 'C', market: 'points', marketImpliedProb: 0.5, modelProb: 0.54, edgeDelta: 0.04, l10: 0.5, volatility: 'high', riskTag: 'watch', reasoning: 'x' }
    ], { topN: 2 });

    expect(ranked.map((row) => row.id)).toEqual(['a', 'b']);
  });
});
