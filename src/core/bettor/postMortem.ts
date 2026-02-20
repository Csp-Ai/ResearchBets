import { getSupabaseServiceClient } from '@/src/services/supabase';

export type BetOutcome = 'win' | 'loss' | 'void';

export type PostMortemInput = {
  betId: string;
  league: string;
  gmConfidence: number;
  outcome: BetOutcome;
  agentWeights: { agentId: string; normalizedWeight: number }[];
  blackSwan?: boolean;
  humanFeedbackSignal?: number;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const expectedFromConfidence = (confidence: number) => clamp(confidence, 0, 1);

export async function recordPostMortem(input: PostMortemInput): Promise<void> {
  if (input.outcome === 'void') return;

  const supabase = getSupabaseServiceClient();
  const expected = expectedFromConfidence(input.gmConfidence);
  const actual = input.outcome === 'win' ? 1 : 0;
  const calibrationFromFeedback = clamp((input.humanFeedbackSignal ?? 0) * 0.02, -0.02, 0.02);
  const performanceDelta = input.blackSwan ? 0 : actual - (expected + calibrationFromFeedback);

  for (const weight of input.agentWeights) {
    const weightedDelta = performanceDelta * weight.normalizedWeight;

    await supabase.rpc('upsert_agent_performance', {
      p_agent_id: weight.agentId,
      p_league: input.league,
      p_accuracy_delta: weightedDelta
    });

    await supabase.from('agent_performance_deltas').insert({
      historical_bet_id: input.betId,
      agent_id: weight.agentId,
      league: input.league,
      gm_confidence: input.gmConfidence,
      outcome: input.outcome,
      performance_delta: weightedDelta
    });
  }
}
