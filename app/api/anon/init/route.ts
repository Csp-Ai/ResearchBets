import { randomUUID } from 'node:crypto';

import { NextResponse } from 'next/server';

import { DbEventEmitter } from '@/src/core/control-plane/emitter';
import { ensureSession } from '@/src/core/control-plane/session';
import { getRuntimeStore } from '@/src/core/persistence/runtimeStoreProvider';

export async function POST(request: Request) {
  const store = getRuntimeStore();
  const body = (await request.json().catch(() => ({}))) as { sessionId?: string };
  const session = await ensureSession(body.sessionId, store);
  const emitter = new DbEventEmitter(store);

  await emitter.emit({
    event_name: body.sessionId ? 'return_visit' : 'session_started',
    timestamp: new Date().toISOString(),
    request_id: randomUUID(),
    trace_id: randomUUID(),
    session_id: session.sessionId,
    user_id: session.userId,
    agent_id: 'session_manager',
    model_version: 'runtime-deterministic-v1',
    properties: {},
  });

  return NextResponse.json(session);
}
