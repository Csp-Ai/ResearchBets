import type { SlipLeg } from '@/src/core/contracts/slip';

export type ReportLeg = SlipLeg & {
  rank?: number;
  hit_rate_l10?: number;
  volatility?: 'low' | 'med' | 'high';
  fragility_score?: number;
  flags?: string[];
  notes_short?: string;
};

export type CorrelationEdge = {
  a_leg_id: string;
  b_leg_id: string;
  kind: 'same_player' | 'same_team' | 'same_game' | 'script_overlap' | 'other';
  severity: 'low' | 'med' | 'high';
  reason: string;
};

export type ScriptCluster = {
  cluster_id: string;
  label: string;
  leg_ids: string[];
  severity: 'low' | 'med' | 'high';
  reason: string;
};

export type FailureForecast = {
  breaker_leg_id?: string;
  breaker_probability_band?: 'low' | 'med' | 'high';
  top_reasons: string[];
};

export type Attribution = {
  outcome?: 'win' | 'loss' | 'push' | 'partial';
  breaker_leg_id?: string;
  tags: string[];
  narrative: string;
};

export type SlipStructureReport = {
  slip_id?: string;
  trace_id?: string;
  mode: 'live' | 'cache' | 'demo';
  reason?: string;
  confidence_band?: 'low' | 'med' | 'high';
  risk_band?: 'low' | 'med' | 'high';
  weakest_leg_id?: string;
  legs: ReportLeg[];
  correlation_edges: CorrelationEdge[];
  script_clusters: ScriptCluster[];
  failure_forecast: FailureForecast;
  reasons: string[];
  attribution?: Attribution;
};

export const attachAttributionToReport = (
  report: SlipStructureReport,
  attribution?: Attribution
): SlipStructureReport => {
  if (!attribution) return report;
  return {
    ...report,
    attribution
  };
};
