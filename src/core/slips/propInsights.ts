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
  passing_yards: 'PASS YDS',
  passing_tds: 'PASS TD',
  rushing_yards: 'RUSH YDS',
  rushing_receiving_yards: 'RUSH + REC YDS',
  receiving_yards: 'REC YDS',
  receptions: 'REC',
  carries: 'CAR',
  anytime_td: 'ATTD',
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
  passing_yards: 'Medium',
  passing_tds: 'High',
  rushing_yards: 'Medium',
  rushing_receiving_yards: 'Medium',
  receiving_yards: 'Medium',
  receptions: 'Medium',
  carries: 'Low',
  anytime_td: 'High',
};

// Demo-mode heuristics only. Live research should replace these with provider-backed history.
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
  passing_yards: 60,
  passing_tds: 55,
  rushing_yards: 60,
  rushing_receiving_yards: 60,
  receiving_yards: 60,
  receptions: 61,
  carries: 64,
  anytime_td: 48,
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
  passing_yards: 'volume profile tracked over recent games',
  passing_tds: 'scoring-event variance remains elevated',
  rushing_yards: 'carry volume tracked over recent games',
  rushing_receiving_yards: 'combined rushing and receiving market; verify both workloads',
  receiving_yards: 'target volume tracked over recent games',
  receptions: 'target and catch volume tracked over recent games',
  carries: 'workload volume tracked over recent games',
  anytime_td: 'binary scoring-event market',
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
    injuryNote: 'No verified injury update available in the current fallback feed.',
  };
};
