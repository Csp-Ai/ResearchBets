import { randomUUID } from 'node:crypto';

import { NextResponse } from 'next/server';

import { DbEventEmitter } from '@/src/core/control-plane/emitter';
import { requireIdempotencyKey, withIdempotency } from '@/src/core/control-plane/idempotency';
import { persistenceDb, type StoredBet } from '@/src/core/persistence/runtimeDb';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const bets = status === 'pending' ? persistenceDb.bets.filter((bet) => bet.status === 'pending') : persistenceDb.bets;
  return NextResponse.json({ bets });
}

export async function POST(request: Request) {
  const body = (await request.json()) as Omit<StoredBet, 'id' | 'createdAt' | 'status' | 'outcome' | 'settledAt' | 'settledProfit'> & {
    idempotencyKey?: string;
  };

  const idempotencyKey = requireIdempotencyKey(body.idempotencyKey ?? null);

  const { response, replayed } = await withIdempotency({
    endpoint: '/api/bets',
    userId: body.userId,
    key: idempotencyKey,
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
      persistenceDb.bets.unshift(bet);
      return bet;
    },
  });

  await new DbEventEmitter().emit({
    eventName: 'BET_LOGGED',
    timestamp: new Date().toISOString(),
    traceId: response.traceId,
    runId: response.runId,
    sessionId: response.sessionId,
    userId: response.userId,
    properties: { betId: response.id, replayed },
  });

  return NextResponse.json(response);
}
