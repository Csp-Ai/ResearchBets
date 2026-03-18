export type SlipStatus = 'alive' | 'eliminated' | 'settled';

export type TrackedLeg = {
  legId: string;
  gameId: string;
  player: string;
  market: string;
  line: string;
  volatility: 'low' | 'medium' | 'high';
  convictionAtBuild?: number;
  notes?: string;
};

export type LegOutcome = 'pending' | 'hit' | 'miss' | 'void';

export type TrackedLegState = TrackedLeg & {
  outcome: LegOutcome;
  currentValue?: number | null;
  targetValue?: number | null;
  updatedAtIso: string;
  missType?: 'role' | 'variance' | 'pace' | 'minutes' | 'blowout' | 'unknown';
};

export type SlipTrackingState = {
  slipId: string;
  trace_id?: string;
  createdAtIso: string;
  mode: 'demo' | 'cache' | 'live';
  status: SlipStatus;
  eliminatedByLegId?: string;
  legs: TrackedLegState[];
  summary?: {
    weakestLegId?: string;
    survivalEstimate?: number;
    learningHighlights: string[];
  };
};
