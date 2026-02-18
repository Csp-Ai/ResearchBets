import { NextResponse } from 'next/server';

import { DbEventEmitter } from '@/src/core/control-plane/emitter';
import { persistenceDb } from '@/src/core/persistence/runtimeDb';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const body = (await request.json()) as { outcome: 'won' | 'lost' | 'push' };
  const bet = persistenceDb.bets.find((item) => item.id === params.id);
  if (!bet) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  bet.status = 'settled';
  bet.outcome = body.outcome;
  bet.settledAt = new Date().toISOString();
  bet.settledProfit = body.outcome === 'won' ? Number((bet.stake * (bet.odds - 1)).toFixed(2)) : body.outcome === 'lost' ? -bet.stake : 0;

  await new DbEventEmitter().emit({
    eventName: 'BET_SETTLED',
    timestamp: new Date().toISOString(),
    traceId: bet.traceId,
    runId: bet.runId,
    sessionId: bet.sessionId,
    userId: bet.userId,
    properties: { betId: bet.id, outcome: bet.outcome },
  });

  return NextResponse.json(bet);
}
