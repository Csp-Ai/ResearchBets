import { randomUUID } from 'node:crypto';

import { recordPostMortem } from '@/src/core/bettor/postMortem';
import { getSupabaseServiceClient } from '@/src/services/supabase';

type HistoricalBetRow = {
  id: string;
  league: string | null;
  status: string | null;
  game_time: string | null;
  game_id: string | null;
  gm_confidence: number | null;
  agent_weights: { agentId: string; normalizedWeight: number }[] | null;
  black_swan_flag: boolean | null;
};

const nowIso = () => new Date().toISOString();

const outcomeFromGameResult = (payload: Record<string, unknown> | null): 'win' | 'loss' | 'void' | null => {
  const value = String(payload?.outcome ?? payload?.result ?? '').toLowerCase();
  if (value === 'win' || value === 'won') return 'win';
  if (value === 'loss' || value === 'lost') return 'loss';
  if (value === 'void' || value === 'push') return 'void';
  return null;
};

const getHumanFeedbackSignal = async (betId: string): Promise<number> => {
  const supabase = getSupabaseServiceClient();
  const { data: posts } = await supabase.from('community_posts').select('id').eq('historical_bet_id', betId);
  const postIds = (posts ?? []).map((row) => row.id as string);
  if (postIds.length === 0) return 0;

  const { data: feedback } = await supabase.from('post_feedback').select('value').in('post_id', postIds);
  const ups = (feedback ?? []).filter((item) => item.value === 'up').length;
  const downs = (feedback ?? []).filter((item) => item.value === 'down').length;
  const total = ups + downs;
  if (total === 0) return 0;
  return (ups - downs) / total;
};

const resolveOutcome = async (bet: HistoricalBetRow): Promise<{ outcome: 'win' | 'loss' | 'void' | null; meta?: Record<string, unknown> }> => {
  if (!bet.game_id) return { outcome: null };
  const supabase = getSupabaseServiceClient();
  const { data } = await supabase
    .from('game_results')
    .select('payload, completed_at')
    .eq('game_id', bet.game_id)
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const payload = (data?.payload as Record<string, unknown> | null) ?? null;
  return { outcome: outcomeFromGameResult(payload), meta: payload ? { provider: 'game_results', completedAt: data?.completed_at } : undefined };
};

const emitEvent = async (eventName: string, properties: Record<string, unknown>) => {
  const supabase = getSupabaseServiceClient();
  await supabase.from('events_analytics').insert({
    event_name: eventName,
    request_id: randomUUID(),
    trace_id: randomUUID(),
    run_id: randomUUID(),
    session_id: 'cron:settle-bets',
    user_id: 'system',
    agent_id: 'daily_auditor',
    model_version: 'settle-bets-v1',
    properties,
    created_at: nowIso()
  });
};

export async function settlePendingBets(batchSize = 100): Promise<{ scanned: number; settled: number; skipped: number; failed: number }> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from('historical_bets')
    .select('id, league, status, game_time, game_id, gm_confidence, agent_weights, black_swan_flag')
    .eq('status', 'pending')
    .lt('game_time', nowIso())
    .limit(batchSize);

  if (error) throw new Error('Unable to query pending bets.');
  const bets = (data ?? []) as HistoricalBetRow[];
  let settled = 0;
  let skipped = 0;
  let failed = 0;

  await emitEvent('settle_bets_run', { scanned: bets.length });

  for (const bet of bets) {
    try {
      if (bet.status && bet.status !== 'pending') {
        skipped += 1;
        continue;
      }

      const resolved = await resolveOutcome(bet);
      if (!resolved.outcome) {
        skipped += 1;
        continue;
      }

      const { error: updateError } = await supabase
        .from('historical_bets')
        .update({
          status: resolved.outcome,
          settlement_status: resolved.outcome,
          outcome: resolved.outcome,
          settled_at: nowIso(),
          outcome_metadata: resolved.meta ?? null
        })
        .eq('id', bet.id)
        .eq('status', 'pending');

      if (updateError) {
        failed += 1;
        await emitEvent('settle_bet_failed', { betId: bet.id, reason: 'update_failed' });
        continue;
      }

      if (resolved.outcome !== 'void') {
        const feedbackSignal = await getHumanFeedbackSignal(bet.id);
        await recordPostMortem({
          betId: bet.id,
          league: bet.league ?? 'unknown',
          gmConfidence: Number(bet.gm_confidence ?? 0.5),
          outcome: resolved.outcome,
          blackSwan: Boolean(bet.black_swan_flag),
          humanFeedbackSignal: feedbackSignal,
          agentWeights: bet.agent_weights ?? []
        });
      }

      settled += 1;
      await emitEvent('settle_bet_success', { betId: bet.id, outcome: resolved.outcome });
    } catch {
      failed += 1;
      await emitEvent('settle_bet_failed', { betId: bet.id, reason: 'exception' });
    }
  }

  return { scanned: bets.length, settled, skipped, failed };
}
