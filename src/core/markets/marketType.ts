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
  'passing_yards',
  'passing_tds',
  'rushing_yards',
  'receiving_yards',
  'receptions',
  'carries',
  'anytime_td',
] as const;

export type MarketType = (typeof SUPPORTED_MARKET_TYPES)[number];

const MARKET_TYPE_SET = new Set<string>(SUPPORTED_MARKET_TYPES);

const MARKET_ALIASES: Record<string, MarketType> = {
  pass_yards: 'passing_yards',
  passing_yds: 'passing_yards',
  pass_yds: 'passing_yards',
  pass_tds: 'passing_tds',
  passing_touchdowns: 'passing_tds',
  rush_yards: 'rushing_yards',
  rushing_yds: 'rushing_yards',
  rush_yds: 'rushing_yards',
  receiving_yds: 'receiving_yards',
  rec_yards: 'receiving_yards',
  rec_yds: 'receiving_yards',
  rush_attempts: 'carries',
  rushing_attempts: 'carries',
  anytime_touchdown: 'anytime_td',
  anytime_touchdown_scorer: 'anytime_td',
  attd: 'anytime_td',
};

export const asMarketType = (value: string | undefined | null, fallback: MarketType): MarketType => {
  if (!value) return fallback;
  const normalized = value.toLowerCase().trim().replace(/[\s-]+/g, '_');
  if (MARKET_TYPE_SET.has(normalized)) return normalized as MarketType;
  return MARKET_ALIASES[normalized] ?? fallback;
};
