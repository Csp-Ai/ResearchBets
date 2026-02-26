import { NextResponse } from 'next/server';

import { DbEventEmitter } from '@/src/core/control-plane/emitter';
import { SlipExtractRequestSchema, SlipExtractResultSchema } from '@/src/core/contracts/envelopes';
import { getRuntimeStore } from '@/src/core/persistence/runtimeStoreProvider';
import { extractLegs } from '@/src/core/slips/extract';
import { buildPropLegInsight } from '@/src/core/slips/propInsights';
import { getTraceContext } from '@/src/core/trace/getTraceContext.server';

export async function POST(request: Request) {
  const trace = getTraceContext(request);
  const parsed = SlipExtractRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: { code: 'invalid_payload', message: 'Invalid extract payload.' }, trace_id: trace.trace_id }, { status: 400 });
  }

  const body = parsed.data;
  const store = getRuntimeStore();
  const slip = await store.getSlipSubmission(body.slip_id);
  if (!slip) return NextResponse.json({ ok: false, error: { code: 'slip_not_found', message: 'Slip submission not found.' }, trace_id: trace.trace_id }, { status: 404 });

  try {
    const legs = extractLegs(slip.rawText);
    const insights = legs.map((leg) => buildPropLegInsight(leg));
    await store.updateSlipSubmission(slip.id, { parseStatus: 'parsed', extractedLegs: legs });
    await new DbEventEmitter(store).emit({
      event_name: 'slip_extracted',
      timestamp: new Date().toISOString(),
      request_id: body.request_id,
      trace_id: slip.traceId,
      session_id: body.anon_session_id,
      user_id: slip.userId,
      agent_id: 'slip_ingestion',
      model_version: 'runtime-deterministic-v1',
      properties: { phase: 'DURING', slip_id: slip.id, extracted_legs_count: legs.length },
    });
    return NextResponse.json({ ok: true, data: SlipExtractResultSchema.parse({ slip_id: slip.id, extracted_legs: legs, leg_insights: insights, trace_id: slip.traceId }), trace_id: slip.traceId, provenance: { mode: 'demo', generatedAt: new Date().toISOString() } });
  } catch (error) {
    await store.updateSlipSubmission(slip.id, { parseStatus: 'failed' });
    await new DbEventEmitter(store).emit({
      event_name: 'slip_extract_failed',
      timestamp: new Date().toISOString(),
      request_id: body.request_id,
      trace_id: slip.traceId,
      session_id: body.anon_session_id,
      user_id: slip.userId,
      agent_id: 'slip_ingestion',
      model_version: 'runtime-deterministic-v1',
      properties: { phase: 'DURING', slip_id: slip.id, error: error instanceof Error ? error.message : 'unknown' },
    });
    return NextResponse.json({ ok: false, error: { code: 'extract_failed', message: 'Failed to parse slip.' }, trace_id: slip.traceId }, { status: 400 });
  }
}
