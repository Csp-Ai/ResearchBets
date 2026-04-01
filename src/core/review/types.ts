import type { LoopProvenance } from '@/src/core/bettor-loop/provenance';
import type { LifecycleDriverLineage, WeakestLegIdentity } from '@/src/core/decision/lifecycleDecision';
import type { Lineage } from '@/src/core/lineage/lineage';
import type { MarketType } from '@/src/core/markets/marketType';
import type { CoverageLevel } from '@/src/core/review/missTagger';
import type { NextTimeRule } from '@/src/core/guardrails/localGuardrails';

export type TicketSettlementStatus = 'won' | 'lost' | 'void' | 'unknown';

export type DraftPostmortemSnapshot = {
  ticketId: string;
  savedAt: string;
  killLeg: string;
  reasons: string[];
  fragilityScore: number;
  coverageSummary: string;
  trace_id?: Lineage['trace_id'];
  run_id?: Lineage['run_id'];
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
  trace_id?: Lineage['trace_id'];
  run_id?: Lineage['run_id'];
  slip_id?: Lineage['slip_id'];
  provenance?: LoopProvenance;
  createdAt: string;
  settledAt: string;
  status: TicketSettlementStatus;
  cashoutTaken?: number;
  legs: PostmortemLegRecord[];
  coverage: { level: CoverageLevel; reasons: string[] };
  fragility: { score: number; chips: string[] };
  narrative: string[];
  coachSnapshot?: DraftPostmortemSnapshot;
  nextTimeRule?: NextTimeRule;
  lifecycle_lineage?: LifecycleDriverLineage;
  weakest_leg_identity?: WeakestLegIdentity;
};
