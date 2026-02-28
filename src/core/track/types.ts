import type { MarketType } from '@/src/core/markets/marketType';

export type TrackedTicketLeg = {
  legId: string;
  league: string;
  gameId?: string;
  teams?: string;
  player: string;
  marketType: MarketType;
  threshold: number;
  direction: 'over' | 'under';
  odds?: string;
  source: string;
};

export type TrackedTicket = {
  ticketId: string;
  createdAt: string;
  sourceHint: string;
  rawSlipText: string;
  legs: TrackedTicketLeg[];
};
