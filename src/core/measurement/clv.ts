import type { MarketType } from '../markets/marketType';
import type { OddsFormat } from './oddsFormat';
import { normalizeOdds } from './oddsFormat';

export const computeLineCLV = ({
  marketType,
  placedLine,
  closingLine,
}: {
  marketType: MarketType;
  placedLine: number | null;
  closingLine: number | null;
}): number | null => {
  if (placedLine == null || closingLine == null || marketType === 'moneyline') return null;
  return Number((closingLine - placedLine).toFixed(4));
};

export const computePriceCLV = ({
  placedPrice,
  closingPrice,
  placedFormat = 'american',
  closingFormat = 'american',
}: {
  placedPrice: number | null;
  closingPrice: number | null;
  placedFormat?: OddsFormat;
  closingFormat?: OddsFormat;
}): number | null => {
  if (placedPrice == null || closingPrice == null) return null;
  const placedProb = normalizeOdds(placedPrice, placedFormat).impliedProbability;
  const closingProb = normalizeOdds(closingPrice, closingFormat).impliedProbability;
  return Number((closingProb - placedProb).toFixed(6));
};
