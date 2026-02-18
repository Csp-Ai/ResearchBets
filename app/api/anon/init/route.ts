import { randomUUID } from 'node:crypto';

import { NextResponse } from 'next/server';

import { DbEventEmitter } from '@/src/core/control-plane/emitter';
import { ensureSession } from '@/src/core/control-plane/session';

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { sessionId?: string };
  const session = ensureSession(body.sessionId);
  const emitter = new DbEventEmitter();
  const traceId = randomUUID();

  await emitter.emit({
    eventName: body.sessionId ? 'RETURN_VISIT' : 'SESSION_STARTED',
    timestamp: new Date().toISOString(),
    traceId,
    sessionId: session.sessionId,
    userId: session.userId,
    properties: {},
  });

  return NextResponse.json(session);
}
