import { randomUUID } from 'node:crypto';

import { NextResponse } from 'next/server';
import { z } from 'zod';

import { DbEventEmitter } from '@/src/core/control-plane/emitter';
import { requireIdempotencyKey, withIdempotency } from '@/src/core/control-plane/idempotency';
import type { StoredBet } from '@/src/core/persistence/runtimeStore';
import { getRuntimeStore } from '@/src/core/persistence/runtimeStoreProvider';
import { normalizeOdds } from '@/src/core/measurement/oddsFormat';

const createBetSchema = z.object({
  userId: z.string(),
  sessionId: z.string(),
  snapshotId: z.string(),
  traceId: z.string(),
  runId: z.string(),
  selection: z.string(),
  gameId: z.string().nullable().optional(),
  marketType: z.enum(['spread', 'total', 'moneyline']).nullable().optional(),
  line: z.number().nullable().optional(),
  book: z.string().nullable().optional(),
  oddsFormat: z.enum(['american', 'decimal', 'implied']),
  price: z.number(),
  recommendedId: z.string().nullable().optional(),
  followedAi: z.boolean().optional(),
  placedLine: z.number().nullable().optional(),
  placedPrice: z.number().nullable().optional(),
  stake: z.number(),
  confidence: z.number(),
  idempotencyKey: z.string().optional(),
});

export async function GET(request: Request) {
  const store = getRuntimeStore();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const bets = await store.listBets(status === 'pending' ? 'pending' : undefined);
  return NextResponse.json({ bets });
}

export async function POST(request: Request) {
  const store = getRuntimeStore();
  const body = createBetSchema.parse(await request.json());

  const idempotencyKey = requireIdempotencyKey(body.idempotencyKey ?? null);

  const { response, replayed } = await withIdempotency({
    endpoint: '/api/bets',
    userId: body.userId,
    key: idempotencyKey,
    store,
    handler: async () => {
      const normalizedOdds = normalizeOdds(body.price, body.oddsFormat);
      const placedPrice = body.placedPrice ?? body.price;
      const placedOdds = normalizeOdds(placedPrice, body.oddsFormat).decimalOdds;
      const bet: StoredBet = {
        id: randomUUID(),
        userId: body.userId,
        sessionId: body.sessionId,
        snapshotId: body.snapshotId,
        traceId: body.traceId,
        runId: body.runId,
        selection: body.selection,
        gameId: body.gameId ?? null,
        marketType: body.marketType ?? null,
        line: body.line ?? null,
        book: body.book ?? null,
        oddsFormat: body.oddsFormat,
        price: body.price,
        odds: normalizedOdds.decimalOdds,
        recommendedId: body.recommendedId ?? null,
        followedAi: body.followedAi ?? Boolean(body.recommendedId),
        placedLine: body.placedLine ?? body.line ?? null,
        placedPrice,
        placedOdds,
        closingLine: null,
        closingPrice: null,
        clvLine: null,
        clvPrice: null,
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
