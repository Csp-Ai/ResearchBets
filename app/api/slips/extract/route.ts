import { NextResponse } from 'next/server';
import { z } from 'zod';

import { DbEventEmitter } from '@/src/core/control-plane/emitter';
import { extractLegs } from '@/src/core/slips/extract';
import { getRuntimeStore } from '@/src/core/persistence/runtimeStoreProvider';

const payloadSchema = z.object({
  slip_id: z.string().uuid(),
  request_id: z.string().min(1),
  anon_session_id: z.string().min(1),
});

export async function POST(request: Request) {
  const body = payloadSchema.parse(await request.json());
  const store = getRuntimeStore();
  const slip = await store.getSlipSubmission(body.slip_id);
  if (!slip) return NextResponse.json({ error: 'Slip submission not found' }, { status: 404 });

  try {
    const legs = extractLegs(slip.rawText);
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
      properties: { slip_id: slip.id, extracted_legs_count: legs.length },
    });
    return NextResponse.json({ slip_id: slip.id, extracted_legs: legs, trace_id: slip.traceId });
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
      properties: { slip_id: slip.id, error: error instanceof Error ? error.message : 'unknown' },
    });
    return NextResponse.json({ error: 'Failed to parse slip' }, { status: 400 });
  }
}
