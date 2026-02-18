export type OddsFormat = 'american' | 'decimal' | 'implied';

export interface NormalizedOdds {
  format: OddsFormat;
  price: number;
  decimalOdds: number;
  impliedProbability: number;
}

const round = (value: number, precision: number): number => Number(value.toFixed(precision));

export const normalizeOdds = (price: number, format: OddsFormat): NormalizedOdds => {
  if (!Number.isFinite(price)) {
    throw new Error('Odds price must be a finite number');
  }

  if (format === 'decimal') {
    if (price < 1) throw new Error('Decimal odds must be >= 1');
    const impliedProbability = price === 0 ? 0 : 1 / price;
    return { format, price, decimalOdds: round(price, 6), impliedProbability: round(impliedProbability, 6) };
  }

  if (format === 'implied') {
    if (price <= 0 || price >= 1) throw new Error('Implied odds must be between 0 and 1');
    return { format, price, decimalOdds: round(1 / price, 6), impliedProbability: round(price, 6) };
  }

  if (price === 0 || Math.abs(price) < 100) {
    throw new Error('American odds must be <= -100 or >= 100');
  }
  const impliedProbability = price > 0 ? 100 / (price + 100) : Math.abs(price) / (Math.abs(price) + 100);
  const decimalOdds = price > 0 ? 1 + price / 100 : 1 + 100 / Math.abs(price);
  return { format, price, decimalOdds: round(decimalOdds, 6), impliedProbability: round(impliedProbability, 6) };
};

export const calculateProfit = ({
  stake,
  format,
  price,
  outcome,
}: {
  stake: number;
  format: OddsFormat;
  price: number;
  outcome: 'won' | 'lost' | 'push';
}): number => {
  if (outcome === 'lost') return -stake;
  if (outcome === 'push') return 0;
  const normalized = normalizeOdds(price, format);
  return round(stake * (normalized.decimalOdds - 1), 2);
};

export const calculateRoiPercent = (profit: number, stake: number): number => {
  if (stake === 0) return 0;
  return round((profit / stake) * 100, 2);
};
