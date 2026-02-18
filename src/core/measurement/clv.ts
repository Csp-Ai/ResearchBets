export type MarketType = 'spread' | 'total' | 'moneyline';

const toImpliedProbability = (americanOdds: number): number => {
  if (americanOdds === 0) return 0.5;
  return americanOdds > 0 ? 100 / (americanOdds + 100) : Math.abs(americanOdds) / (Math.abs(americanOdds) + 100);
};

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
}: {
  placedPrice: number | null;
  closingPrice: number | null;
}): number | null => {
  if (placedPrice == null || closingPrice == null) return null;
  const placedProb = toImpliedProbability(placedPrice);
  const closingProb = toImpliedProbability(closingPrice);
  return Number((closingProb - placedProb).toFixed(6));
};
