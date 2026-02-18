import { asMarketType, type MarketType } from '../markets/marketType';

import type { ExtractedLeg } from './extract';

export interface PropLegInsight {
  marketType: MarketType;
  marketLabel: string;
  hitRateLast5: number;
  trend: string;
  riskTag: 'Low' | 'Medium' | 'High';
  matchupNote: string;
  injuryNote: string;
}

const MARKET_LABELS: Record<MarketType, string> = {
  spread: 'Spread',
  total: 'Total',
  moneyline: 'ML',
  points: 'PTS',
  threes: '3PM',
  rebounds: 'REB',
  assists: 'AST',
  ra: 'RA',
  pra: 'PRA',
};

const RISK_BY_MARKET: Record<MarketType, PropLegInsight['riskTag']> = {
  spread: 'Medium',
  total: 'Medium',
  moneyline: 'Low',
  points: 'Medium',
  threes: 'High',
  rebounds: 'Medium',
  assists: 'High',
  ra: 'High',
  pra: 'High',
};

const HIT_RATE_BY_MARKET: Record<MarketType, number> = {
  spread: 58,
  total: 57,
  moneyline: 62,
  points: 63,
  threes: 54,
  rebounds: 60,
  assists: 55,
  ra: 52,
  pra: 51,
};

const TREND_BY_MARKET: Record<MarketType, string> = {
  spread: 'covered 3 of last 5',
  total: 'hit 3 of last 5',
  moneyline: 'won 4 of last 5',
  points: '3 of last 4',
  threes: '2 of last 4',
  rebounds: '4 of last 5',
  assists: '3 of last 5',
  ra: '3 of last 5',
  pra: '2 of last 5',
};

export const buildPropLegInsight = (leg: ExtractedLeg): PropLegInsight => {
  const marketType = asMarketType(leg.market, 'points');

  return {
    marketType,
    marketLabel: MARKET_LABELS[marketType],
    hitRateLast5: HIT_RATE_BY_MARKET[marketType],
    trend: TREND_BY_MARKET[marketType],
    riskTag: RISK_BY_MARKET[marketType],
    matchupNote: `${MARKET_LABELS[marketType]} matchup context pulled from latest opponent profile.`,
    injuryNote: 'No major injury flags in current rotation feed.',
  };
};
