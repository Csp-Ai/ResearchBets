import { randomUUID } from 'node:crypto';

import { NextResponse } from 'next/server';

import { DbEventEmitter } from '@/src/core/control-plane/emitter';
import { getRuntimeStore } from '@/src/core/persistence/runtimeStoreProvider';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const store = getRuntimeStore();
  const body = (await request.json()) as { outcome: 'won' | 'lost' | 'push' };
  const bet = await store.getBet(params.id);
  if (!bet) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  bet.status = 'settled';
  bet.outcome = body.outcome;
  bet.settledAt = new Date().toISOString();
  bet.settledProfit = body.outcome === 'won' ? Number((bet.stake * (bet.odds - 1)).toFixed(2)) : body.outcome === 'lost' ? -bet.stake : 0;
  await store.saveBet(bet);

  await new DbEventEmitter(store).emit({
    event_name: 'user_outcome_recorded',
    timestamp: new Date().toISOString(),
    request_id: randomUUID(),
    trace_id: bet.traceId,
    run_id: bet.runId,
    session_id: bet.sessionId,
    user_id: bet.userId,
    agent_id: 'bet_lifecycle',
    model_version: 'runtime-deterministic-v1',
    properties: {
      outcome_id: `outcome_${bet.id}`,
      bet_id: bet.id,
      settlement_status: body.outcome === 'push' ? 'void' : body.outcome,
      pnl_amount: bet.settledProfit,
      odds: bet.odds,
      settled_at: bet.settledAt,
    },
  });

  return NextResponse.json(bet);
}
