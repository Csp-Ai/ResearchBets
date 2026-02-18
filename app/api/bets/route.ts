import { randomUUID } from 'node:crypto';

import { NextResponse } from 'next/server';

import { DbEventEmitter } from '@/src/core/control-plane/emitter';
import { requireIdempotencyKey, withIdempotency } from '@/src/core/control-plane/idempotency';
import type { StoredBet } from '@/src/core/persistence/runtimeStore';
import { getRuntimeStore } from '@/src/core/persistence/runtimeStoreProvider';

export async function GET(request: Request) {
  const store = getRuntimeStore();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const bets = await store.listBets(status === 'pending' ? 'pending' : undefined);
  return NextResponse.json({ bets });
}

export async function POST(request: Request) {
  const store = getRuntimeStore();
  const body = (await request.json()) as Omit<StoredBet, 'id' | 'createdAt' | 'status' | 'outcome' | 'settledAt' | 'settledProfit'> & {
    idempotencyKey?: string;
  };

  const idempotencyKey = requireIdempotencyKey(body.idempotencyKey ?? null);

  const { response, replayed } = await withIdempotency({
    endpoint: '/api/bets',
    userId: body.userId,
    key: idempotencyKey,
    store,
    handler: async () => {
      const bet: StoredBet = {
        id: randomUUID(),
        userId: body.userId,
        sessionId: body.sessionId,
        snapshotId: body.snapshotId,
        traceId: body.traceId,
        runId: body.runId,
        selection: body.selection,
        odds: body.odds,
        stake: body.stake,
        confidence: body.confidence,
        status: 'pending',
        outcome: null,
        settledProfit: null,
        createdAt: new Date().toISOString(),
        settledAt: null,
      };
      await store.saveBet(bet);
      return bet;
    },
  });

  await new DbEventEmitter(store).emit({
    event_name: 'bet_logged',
    timestamp: new Date().toISOString(),
    request_id: randomUUID(),
    trace_id: response.traceId,
    run_id: response.runId,
    session_id: response.sessionId,
    user_id: response.userId,
    agent_id: 'bet_lifecycle',
    model_version: 'runtime-deterministic-v1',
    properties: { bet_id: response.id, replayed },
  });

  return NextResponse.json(response);
}
