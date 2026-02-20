import type { SupabaseClient } from '@supabase/supabase-js';

export type HistoricalBet = {
  id: string;
  user_id: string;
  bet_title: string;
  stake: number;
  odds: number;
  outcome: 'pending' | 'won' | 'lost' | 'void';
  created_at: string;
};

export type CreateHistoricalBetInput = {
  bet_title: string;
  stake: number;
  odds: number;
  outcome?: HistoricalBet['outcome'];
};

const TABLE = 'historical_bets';

export async function listHistoricalBets(client: SupabaseClient, userId: string): Promise<HistoricalBet[]> {
  const { data, error } = await client
    .from(TABLE)
    .select('id,user_id,bet_title,stake,odds,outcome,created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as HistoricalBet[];
}

export async function createHistoricalBet(
  client: SupabaseClient,
  userId: string,
  payload: CreateHistoricalBetInput
): Promise<HistoricalBet> {
  const { data, error } = await client
    .from(TABLE)
    .insert({
      user_id: userId,
      bet_title: payload.bet_title,
      stake: payload.stake,
      odds: payload.odds,
      outcome: payload.outcome ?? 'pending'
    })
    .select('id,user_id,bet_title,stake,odds,outcome,created_at')
    .single();

  if (error) {
    throw error;
  }

  return data as HistoricalBet;
}
