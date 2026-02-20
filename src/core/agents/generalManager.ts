export type AgentSignal = 'buy' | 'avoid' | 'hold' | 'insufficient_data';
export type MarketType = 'player_prop' | 'game_spread' | 'game_total' | 'other';

export type SpecialistAgentPayload = {
  agentId: 'LineSensei' | 'InjuryInsider' | 'TrendRider';
  signal: AgentSignal;
  confidence: number;
  weakestLegId?: string;
  summary?: string;
  league?: string;
};

export type GeneralManagerInput = {
  marketType: MarketType;
  legs: { id: string }[];
  payloads: SpecialistAgentPayload[];
  performanceAdjustments?: Record<string, number>;
};

export type AgentWeight = {
  agentId: SpecialistAgentPayload['agentId'];
  weight: number;
  normalizedWeight: number;
  adjustedByPerformance: number;
};

export type GeneralManagerVerdict = {
  verdict: string;
  confidence: number;
  weakestLegId: string | null;
  agentWeights: AgentWeight[];
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const baseWeightsForMarket = (marketType: MarketType): Record<SpecialistAgentPayload['agentId'], number> => {
  if (marketType === 'player_prop') return { InjuryInsider: 0.5, LineSensei: 0.3, TrendRider: 0.2 };
  if (marketType === 'game_spread') return { InjuryInsider: 0.2, LineSensei: 0.55, TrendRider: 0.25 };
  return { InjuryInsider: 0.33, LineSensei: 0.34, TrendRider: 0.33 };
};

const scoreFromSignal = (signal: AgentSignal): number => {
  switch (signal) {
    case 'buy':
      return 1;
    case 'hold':
      return 0;
    case 'avoid':
      return -1;
    default:
      return 0;
  }
};

export function runGeneralManager(input: GeneralManagerInput): GeneralManagerVerdict {
  if (input.payloads.length === 0) {
    return { verdict: 'Insufficient Data', confidence: 0, weakestLegId: null, agentWeights: [] };
  }

  const base = baseWeightsForMarket(input.marketType);
  const weights = input.payloads.map<AgentWeight>((payload) => {
    const adjustment = input.performanceAdjustments?.[payload.agentId] ?? 0;
    const weight = clamp(base[payload.agentId] + adjustment, 0.05, 0.8);
    return { agentId: payload.agentId, weight, normalizedWeight: 0, adjustedByPerformance: adjustment };
  });

  const total = weights.reduce((sum, w) => sum + w.weight, 0);
  const normalized = weights.map((weight) => ({ ...weight, normalizedWeight: total > 0 ? weight.weight / total : 0 }));

  const allInsufficient = input.payloads.every((payload) => payload.signal === 'insufficient_data');
  if (allInsufficient) {
    return { verdict: 'Insufficient Data', confidence: 0, weakestLegId: null, agentWeights: normalized };
  }

  let aggregateSignal = 0;
  let aggregateConfidence = 0;
  for (const payload of input.payloads) {
    const signalWeight = normalized.find((weight) => weight.agentId === payload.agentId)?.normalizedWeight ?? 0;
    aggregateSignal += scoreFromSignal(payload.signal) * signalWeight;
    aggregateConfidence += clamp(payload.confidence, 0, 1) * signalWeight;
  }

  const weakestLegVotes = new Map<string, number>();
  for (const payload of input.payloads) {
    if (!payload.weakestLegId) continue;
    const signalWeight = normalized.find((weight) => weight.agentId === payload.agentId)?.normalizedWeight ?? 0;
    weakestLegVotes.set(payload.weakestLegId, (weakestLegVotes.get(payload.weakestLegId) ?? 0) + signalWeight);
  }

  const weakestLegId = [...weakestLegVotes.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? input.legs[0]?.id ?? null;
  const confidence = clamp(Math.round(((Math.abs(aggregateSignal) * 0.45) + (aggregateConfidence * 0.55)) * 100) / 100, 0, 1);

  const verdict = aggregateSignal > 0.2
    ? 'High value angle, but keep risk sizing disciplined before lock.'
    : aggregateSignal < -0.2
      ? 'Edge is fragile right now; pass unless late news materially improves the setup.'
      : 'Balanced signals with no clear edge yet, so wait for stronger confirmation.';

  return { verdict, confidence, weakestLegId, agentWeights: normalized };
}
