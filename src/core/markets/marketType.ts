// Refer to MarketType for all prop logic. Do not hardcode string markets.
export const SUPPORTED_MARKET_TYPES = [
  'spread',
  'total',
  'moneyline',
  'points',
  'threes',
  'rebounds',
  'assists',
  'ra',
  'pra',
] as const;

export type MarketType = (typeof SUPPORTED_MARKET_TYPES)[number];

const MARKET_TYPE_SET = new Set<string>(SUPPORTED_MARKET_TYPES);

export const asMarketType = (value: string | undefined | null, fallback: MarketType): MarketType => {
  if (!value) return fallback;
  const normalized = value.toLowerCase().trim();
  return MARKET_TYPE_SET.has(normalized) ? (normalized as MarketType) : fallback;
};
