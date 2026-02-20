import { getSupabaseServiceClient } from '@/src/services/supabase';

export type BetOutcome = 'win' | 'loss';

export type PostMortemInput = {
  betId: string;
  league: string;
  gmConfidence: number;
  outcome: BetOutcome;
  agentWeights: { agentId: string; normalizedWeight: number }[];
};

const expectedFromConfidence = (confidence: number) => Math.min(1, Math.max(0, confidence));

export async function recordPostMortem(input: PostMortemInput): Promise<void> {
  const supabase = getSupabaseServiceClient();
  const expected = expectedFromConfidence(input.gmConfidence);
  const actual = input.outcome === 'win' ? 1 : 0;
  const performanceDelta = actual - expected;

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
