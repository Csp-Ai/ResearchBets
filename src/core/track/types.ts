import type { LoopProvenance } from '@/src/core/bettor-loop/provenance';
import type { Lineage } from '@/src/core/lineage/lineage';
import type { MarketType } from '@/src/core/markets/marketType';
import type { TodayMode } from '@/src/core/today/types';

export type ParseConfidence = 'high' | 'medium' | 'low';

export type CoverageReason = 'no_game_id' | 'provider_unavailable' | 'unsupported_market';
export type CoverageState = 'covered' | 'missing';

export type TrackedTicketEntryLegState = {
  capturedAt: string;
  currentValue: number;
  quarter: 1 | 2 | 3 | 4;
  timeRemainingSec: number;
  elapsedGameMinutes: number;
  opportunityCount?: number;
  opportunityLabel?: 'pass attempts' | 'carries' | 'targets';
};

export type TrackedTicketEntrySnapshot = {
  capturedAt: string;
  captureSource: 'decision_time' | 'first_verified_after_tracking';
  timing: 'pregame' | 'live' | 'unknown';
  exactDecisionTime: boolean;
  note?: string;
  legs: Record<string, TrackedTicketEntryLegState>;
};

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
  trace_id?: Lineage['trace_id'];
  run_id?: Lineage['run_id'];
  slip_id?: Lineage['slip_id'];
  anon_session_id?: Lineage['anon_session_id'];
  sport?: Lineage['sport'];
  tz?: Lineage['tz'];
  date?: Lineage['date'];
  mode?: TodayMode;
  provenance?: LoopProvenance;
  entrySnapshot?: TrackedTicketEntrySnapshot;
};
