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

export type ParlayStyle = 'Conservative' | 'Balanced' | 'YOLO';

export interface AltLegSuggestion {
  legIndex: number;
  originalLine: number;
  suggestedLine: number;
  suggestionLabel: string;
}

const toMarketType = (leg: ExtractedLeg): MarketType => asMarketType(leg.market, 'points');

export const getParlayCorrelationScore = (
  legs: ParlayCorrelationLeg[]
): ParlayCorrelationResult => {
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
    if (
      marketType === 'threes' ||
      marketType === 'assists' ||
      marketType === 'ra' ||
      marketType === 'pra'
    ) {
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
  const varianceLabel =
    result.strength === 'high'
      ? 'High variance'
      : result.strength === 'medium'
        ? 'Medium variance'
        : 'Lower variance';
  return `${varianceLabel} ${legs.length}-leg combo`;
};

export const getParlayStyle = (score: number): ParlayStyle => {
  if (score >= 0.7) return 'YOLO';
  if (score >= 0.4) return 'Balanced';
  return 'Conservative';
};

function parseLineFromSelection(selection: string): number | null {
  const match = selection.match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

export const suggestAltLeg = (legs: ParlayCorrelationLeg[]): AltLegSuggestion | null => {
  for (let index = 0; index < legs.length; index += 1) {
    const leg = legs[index]!;
    const marketType = toMarketType(leg);
    if (!['points', 'threes', 'assists', 'ra', 'pra'].includes(marketType)) {
      continue;
    }

    const line = parseLineFromSelection(leg.selection);
    if (line === null) continue;

    const step = marketType === 'threes' ? 0.5 : 3;
    const suggestedLine = Number(Math.max(line - step, 0.5).toFixed(1));
    return {
      legIndex: index,
      originalLine: line,
      suggestedLine,
      suggestionLabel: `Consider o${suggestedLine} instead of o${line.toFixed(1)} for a steadier floor.`
    };
  }

  return null;
};
