import { randomUUID } from 'node:crypto';

import { NextResponse } from 'next/server';
import { z } from 'zod';

import { DbEventEmitter } from '@/src/core/control-plane/emitter';
import { getRuntimeStore } from '@/src/core/persistence/runtimeStoreProvider';
import { getSupabaseServerClient } from '@/src/core/supabase/server';
import { getTraceContext } from '@/src/core/trace/getTraceContext.server';
import { updateWeights } from '@/src/core/learning/updateWeights.server';

const OutcomeLogSchema = z.object({
  run_id: z.string().min(1),
  trace_id: z.string().min(1).optional(),
  selection_key: z.string().min(1),
  result: z.enum(['win', 'loss', 'push']),
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
  const settledAt = body.settled_at ?? new Date().toISOString();
  const outcomeId = randomUUID();
  const learning = updateWeights(body.selection_key, body.result);

  try {
    const supabase = await getSupabaseServerClient();
    await supabase.from('outcomes').insert({
      id: outcomeId,
      run_id: body.run_id,
      trace_id: body.trace_id ?? trace.trace_id,
      selection_key: body.selection_key,
      result: body.result,
      actual_value: body.actual_value ?? null,
      settled_at: settledAt,
    });
  } catch {
    // deterministic mode: allow local runtime without supabase table
  }

  await new DbEventEmitter(getRuntimeStore()).emit({
    event_name: 'learning_update',
    timestamp: new Date().toISOString(),
    request_id: randomUUID(),
    trace_id: body.trace_id ?? trace.trace_id,
    run_id: body.run_id,
    session_id: 'outcomes_log',
    user_id: null,
    agent_id: 'learning_loop',
    model_version: 'deterministic-v1',
    properties: {
      selection_key: body.selection_key,
      result: body.result,
      delta: learning.delta,
      next_weight: learning.nextWeight,
      settled_at: settledAt,
    }
  });

  return NextResponse.json({ ok: true, trace_id: body.trace_id ?? trace.trace_id, outcome_id: outcomeId, learning });
}
