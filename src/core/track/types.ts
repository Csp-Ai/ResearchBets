import type { MarketType } from '@/src/core/markets/marketType';

export type ParseConfidence = 'high' | 'medium' | 'low';

export type CoverageReason = 'no_game_id' | 'provider_unavailable' | 'unsupported_market';
export type CoverageState = 'covered' | 'missing';

export type TrackedTicketLeg = {
  legId: string;
  league: string;
  gameId?: string;
  teams?: string;
  player: string;
  rawPlayer?: string;
  marketType: MarketType;
  marketLabel?: string;
  threshold: number;
  direction: 'over' | 'under';
  odds?: string;
  source: string;
  parseConfidence: ParseConfidence;
  needsReview?: boolean;
  rawText?: string;
  ladder?: boolean;
};

export type TrackedTicket = {
  ticketId: string;
  createdAt: string;
  sourceHint: string;
  rawSlipText: string;
  cashoutAvailable?: boolean;
  cashoutValue?: number;
  legs: TrackedTicketLeg[];
};
