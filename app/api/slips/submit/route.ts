import { createHash, randomUUID } from 'node:crypto';

import { NextResponse } from 'next/server';
import { z } from 'zod';

import { DbEventEmitter } from '@/src/core/control-plane/emitter';
import { getRuntimeStore } from '@/src/core/persistence/runtimeStoreProvider';

const payloadSchema = z.object({
  anon_session_id: z.string().min(1),
  user_id: z.string().optional().nullable(),
  source: z.enum(['paste', 'upload']),
  raw_text: z.string().min(1),
  request_id: z.string().min(1),
  trace_id: z.string().min(1).optional(),
});

export async function POST(request: Request) {
  const body = payloadSchema.parse(await request.json());
  const store = getRuntimeStore();
  const checksum = createHash('sha256').update(body.raw_text).digest('hex');
  const id = randomUUID();
  const traceId = body.trace_id ?? randomUUID();

  await store.createSlipSubmission({
    id,
    anonSessionId: body.anon_session_id,
    userId: body.user_id ?? null,
    createdAt: new Date().toISOString(),
    source: body.source,
    rawText: body.raw_text,
    parseStatus: 'received',
    extractedLegs: null,
    traceId,
    requestId: body.request_id,
    checksum,
  });

  await new DbEventEmitter(store).emit({
    event_name: 'slip_submitted',
    timestamp: new Date().toISOString(),
    request_id: body.request_id,
    trace_id: traceId,
    session_id: body.anon_session_id,
    user_id: body.user_id ?? null,
    agent_id: 'slip_ingestion',
    model_version: 'runtime-deterministic-v1',
    properties: { slip_id: id, source: body.source, checksum },
  });

  return NextResponse.json({ slip_id: id, trace_id: traceId });
}
