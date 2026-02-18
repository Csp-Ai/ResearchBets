import { asMarketType, type MarketType } from '../markets/marketType';

import type { ExtractedLeg } from '../slips/extract';

export interface ParlayCorrelationLeg extends ExtractedLeg {
  team?: string;
  gameId?: string;
}

export interface ParlayCorrelationResult {
  score: number;
  strength: 'low' | 'medium' | 'high';
  correlatedPairs: Array<{ first: number; second: number; reason: 'same_team' | 'same_game' }>;
}

const toMarketType = (leg: ExtractedLeg): MarketType => asMarketType(leg.market, 'points');

export const getParlayCorrelationScore = (legs: ParlayCorrelationLeg[]): ParlayCorrelationResult => {
  if (legs.length <= 1) {
    return { score: 0.12, strength: 'low', correlatedPairs: [] };
  }

  const correlatedPairs: ParlayCorrelationResult['correlatedPairs'] = [];

  legs.forEach((leg, first) => {
    for (let second = first + 1; second < legs.length; second += 1) {
      const next = legs[second]!;
      if (leg.team && next.team && leg.team === next.team) {
        correlatedPairs.push({ first, second, reason: 'same_team' });
      } else if (leg.gameId && next.gameId && leg.gameId === next.gameId) {
        correlatedPairs.push({ first, second, reason: 'same_game' });
      }
    }
  });

  const marketVarianceBoost = legs.reduce((boost, leg) => {
    const marketType = toMarketType(leg);
    if (marketType === 'threes' || marketType === 'assists' || marketType === 'ra' || marketType === 'pra') {
      return boost + 0.08;
    }
    return boost + 0.03;
  }, 0);

  const base = Math.min(0.3 + correlatedPairs.length * 0.2 + marketVarianceBoost, 0.95);
  const score = Number(base.toFixed(2));

  if (score >= 0.7) {
    return { score, strength: 'high', correlatedPairs };
  }
  if (score >= 0.4) {
    return { score, strength: 'medium', correlatedPairs };
  }
  return { score, strength: 'low', correlatedPairs };
};

export const summarizeParlayRisk = (legs: ParlayCorrelationLeg[]): string => {
  const result = getParlayCorrelationScore(legs);
  const varianceLabel = result.strength === 'high' ? 'High variance' : result.strength === 'medium' ? 'Medium variance' : 'Lower variance';
  return `${varianceLabel} ${legs.length}-leg combo`;
};
