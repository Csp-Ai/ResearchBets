import type { MarketType } from '@/src/core/markets/marketType';
import type { CoverageLevel } from '@/src/core/review/missTagger';

export type TicketSettlementStatus = 'won' | 'lost' | 'void' | 'unknown';

export type DraftPostmortemSnapshot = {
  ticketId: string;
  savedAt: string;
  killLeg: string;
  reasons: string[];
  fragilityScore: number;
  coverageSummary: string;
};

export type PostmortemLegRecord = {
  legId: string;
  player: string;
  statType: MarketType;
  target: number;
  finalValue: number;
  delta: number;
  hit: boolean;
  missTags: string[];
  missNarrative: string;
  lessonHint: string;
};

export type PostmortemRecord = {
  ticketId: string;
  createdAt: string;
  settledAt: string;
  status: TicketSettlementStatus;
  cashoutTaken?: number;
  legs: PostmortemLegRecord[];
  coverage: { level: CoverageLevel; reasons: string[] };
  fragility: { score: number; chips: string[] };
  narrative: string[];
  coachSnapshot?: DraftPostmortemSnapshot;
};
