import { randomUUID } from 'node:crypto';

import { NextResponse } from 'next/server';

import { DbEventEmitter } from '@/src/core/control-plane/emitter';
import { calculateProfit } from '@/src/core/measurement/oddsFormat';
import { getRuntimeStore } from '@/src/core/persistence/runtimeStoreProvider';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const store = getRuntimeStore();
  const body = (await request.json()) as { outcome: 'won' | 'lost' | 'push' };
  const bet = await store.getBet(params.id);
  if (!bet) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (!bet.oddsFormat || bet.placedPrice == null) {
    return NextResponse.json({ error: 'Bet is missing odds_format or placed_price' }, { status: 400 });
  }

  bet.status = 'settled';
  bet.outcome = body.outcome;
  bet.settledAt = new Date().toISOString();
  bet.settledProfit = calculateProfit({ stake: bet.stake, format: bet.oddsFormat, price: bet.placedPrice, outcome: body.outcome });
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
