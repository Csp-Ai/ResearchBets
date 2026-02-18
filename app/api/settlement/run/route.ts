import { randomUUID } from 'node:crypto';

import { NextResponse } from 'next/server';

import { DbEventEmitter } from '@/src/core/control-plane/emitter';
import { runSettlementForGame } from '@/src/core/measurement/settlement';
import { getRuntimeStore } from '@/src/core/persistence/runtimeStoreProvider';

export async function POST(request: Request) {
  const store = getRuntimeStore();
  const { searchParams } = new URL(request.url);
  const gameId = searchParams.get('gameId');
  if (!gameId) return NextResponse.json({ error: 'gameId required' }, { status: 400 });
  const emitter = new DbEventEmitter(store);
  await runSettlementForGame(
    gameId,
    {
      requestId: randomUUID(),
      traceId: randomUUID(),
      runId: randomUUID(),
      sessionId: 'system',
      userId: 'system',
      agentId: 'settlement_runner',
      modelVersion: 'runtime-deterministic-v1',
    },
    emitter,
    store,
  );
  return NextResponse.json({ ok: true });
}
