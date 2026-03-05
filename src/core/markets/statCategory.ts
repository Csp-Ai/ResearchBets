import type { MarketType } from './marketType';

export const FEATURED_STAT_CATEGORY_ORDER = ['pra', 'points', 'rebounds', 'assists', 'threes'] as const;

export type FeaturedStatCategory = (typeof FEATURED_STAT_CATEGORY_ORDER)[number];

export const FEATURED_STAT_LABEL: Record<FeaturedStatCategory, string> = {
  pra: 'PRA',
  points: 'PTS',
  rebounds: 'REB',
  assists: 'AST',
  threes: '3PM'
};

export const mapMarketToFeaturedStatCategory = (market: MarketType): FeaturedStatCategory | null => {
  switch (market) {
    case 'pra':
    case 'points':
    case 'rebounds':
    case 'assists':
    case 'threes':
      return market;
    default:
      return null;
  }
};
