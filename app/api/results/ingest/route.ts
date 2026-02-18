import { randomUUID } from 'node:crypto';

import { NextResponse } from 'next/server';

import { DbEventEmitter } from '@/src/core/control-plane/emitter';
import { ingestGameResult } from '@/src/core/measurement/results';
import { getRuntimeStore } from '@/src/core/persistence/runtimeStoreProvider';

export async function POST(request: Request) {
  const store = getRuntimeStore();
  const body = (await request.json()) as { gameId: string; payload: Record<string, unknown>; sessionId?: string; userId?: string };
  const emitter = new DbEventEmitter(store);
  await ingestGameResult(
    body.gameId,
    body.payload,
    {
      requestId: randomUUID(),
      traceId: randomUUID(),
      runId: randomUUID(),
      sessionId: body.sessionId ?? 'system',
      userId: body.userId ?? 'system',
      agentId: 'results_ingest',
      modelVersion: 'runtime-deterministic-v1',
    },
    emitter,
    store,
  );
  return NextResponse.json({ ok: true });
}
