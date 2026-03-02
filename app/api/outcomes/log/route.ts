import { randomUUID } from 'node:crypto';

import { NextResponse } from 'next/server';
import { z } from 'zod';

import { DbEventEmitter } from '@/src/core/control-plane/emitter';
import { normalizeLineage } from '@/src/core/lineage/lineage';
import { deriveSlipRiskSummary } from '@/src/core/slips/slipRiskSummary';
import { presentRecommendation } from '@/src/core/slips/recommendationPresentation';
import { getRuntimeStore } from '@/src/core/persistence/runtimeStoreProvider';
import { getSupabaseServerClient } from '@/src/core/supabase/server';
import { getTraceContext } from '@/src/core/trace/getTraceContext.server';
import { updateWeights } from '@/src/core/learning/updateWeights.server';
import type { SlipIntelLeg } from '@/src/core/slips/slipIntelligence';

const OutcomeLogSchema = z.object({
  run_id: z.string().min(1),
  trace_id: z.string().min(1).optional(),
  user_id: z.string().min(1).optional(),
  selection_key: z.string().min(1),
  result: z.enum(['win', 'loss', 'push']),
  ticketId: z.string().min(1).optional(),
  slip_id: z.string().min(1).optional(),
  expected_confidence: z.number().min(0).max(100).optional(),
  verdict_internal: z.enum(['KEEP', 'MODIFY', 'PASS']).optional(),
  verdict_presented: z.enum(['TAKE', 'MODIFY', 'PASS']).optional(),
  weakest_leg: z.string().min(1).optional(),
  top_reasons: z.array(z.string()).optional(),
  weakest_leg_failed: z.boolean().optional(),
  slip_legs: z.array(z.object({
    id: z.string().optional(),
    player: z.string().optional(),
    selection: z.string().optional(),
    market: z.string().optional(),
    line: z.union([z.string(), z.number()]).optional(),
    odds: z.string().optional(),
    team: z.string().optional()
  })).optional(),
  actual_value: z.number().optional(),
  settled_at: z.string().datetime().optional(),
});

export async function POST(request: Request) {
  const trace = getTraceContext(request);
  const parsed = OutcomeLogSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, trace_id: trace.trace_id, error: 'Invalid outcome payload.' }, { status: 400 });
  }

  const body = parsed.data;
  const lineage = normalizeLineage({
    trace_id: body.trace_id ?? trace.trace_id,
    run_id: body.run_id,
    ticketId: body.ticketId,
    slip_id: body.slip_id,
  });
  const settledAt = body.settled_at ?? new Date().toISOString();
  const outcomeId = randomUUID();
  const learning = updateWeights(body.selection_key, body.result);
  const normalizedOutcome = body.result.toUpperCase() as 'WIN' | 'LOSS' | 'PUSH';

  const riskSummary = body.slip_legs?.length
    ? deriveSlipRiskSummary(body.slip_legs as SlipIntelLeg[])
    : null;

  const verdictInternal = body.verdict_internal ?? riskSummary?.recommendation ?? 'MODIFY';
  const verdictPresented = body.verdict_presented ?? presentRecommendation(verdictInternal);
  const expectedConfidence = body.expected_confidence ?? riskSummary?.confidencePct ?? 50;
  const weakestLeg = body.weakest_leg ?? riskSummary?.weakestLeg ?? body.selection_key;
  const fragilityScore = riskSummary?.fragilityScore ?? Math.max(0, Math.min(100, 100 - expectedConfidence));
  const correlationScore = riskSummary?.correlationFlag ? 60 : 35;
  const topReasons = body.top_reasons ?? riskSummary?.reasonBullets ?? [];
  const hitWeakestLeg = body.weakest_leg_failed ?? (normalizedOutcome === 'LOSS');
  const verdictCorrect = verdictPresented === 'TAKE'
    ? normalizedOutcome === 'WIN'
    : normalizedOutcome !== 'WIN';

  const store = getRuntimeStore();

  try {
    await store.saveSlipOutcome({
      id: outcomeId,
      traceId: lineage.trace_id,
      runId: lineage.run_id,
      ticketId: lineage.ticketId,
      slipId: lineage.slip_id,
      userId: body.user_id ?? null,
      verdictInternal,
      verdictPresented,
      confidenceScore: expectedConfidence,
      fragilityScore,
      correlationScore,
      weakestLeg,
      topReasons,
      finalOutcome: normalizedOutcome,
      hitWeakestLeg,
      verdictCorrect,
      createdAt: settledAt
    });
  } catch {
    try {
      const supabase = await getSupabaseServerClient();
      await supabase.from('outcomes').insert({
        id: outcomeId,
        run_id: lineage.run_id,
        trace_id: lineage.trace_id,
        selection_key: body.selection_key,
        result: body.result,
        actual_value: body.actual_value ?? null,
        settled_at: settledAt,
      });
    } catch {
      // deterministic mode: allow local runtime without supabase table
    }
  }

  await new DbEventEmitter(store).emit({
    event_name: 'learning_update',
    timestamp: new Date().toISOString(),
    request_id: randomUUID(),
    trace_id: lineage.trace_id,
    run_id: lineage.run_id,
    session_id: 'outcomes_log',
    user_id: null,
    agent_id: 'learning_loop',
    model_version: 'deterministic-v1',
    properties: {
      selection_key: body.selection_key,
      result: body.result,
      ticketId: lineage.ticketId,
      slip_id: lineage.slip_id,
      verdict_internal: verdictInternal,
      verdict_presented: verdictPresented,
      expected_confidence: expectedConfidence,
      weakest_leg: weakestLeg,
      weakest_leg_failed: hitWeakestLeg,
      verdict_correct: verdictCorrect,
      delta: learning.delta,
      next_weight: learning.nextWeight,
      settled_at: settledAt,
    }
  });

  return NextResponse.json({ ok: true, trace_id: lineage.trace_id, run_id: lineage.run_id, outcome_id: outcomeId, learning });
}
