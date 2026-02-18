import { randomUUID } from 'node:crypto';

import { NextResponse } from 'next/server';
import { z } from 'zod';

import { DbEventEmitter } from '@/src/core/control-plane/emitter';
import { TrackedBetSchema } from '@/src/core/contracts/terminalSchemas';
import { getRuntimeStore } from '@/src/core/persistence/runtimeStoreProvider';

const schema = z.object({
  gameId: z.string().min(1),
  propId: z.string().min(1),
  player: z.string().min(1),
  market: z.string().min(1),
  line: z.number(),
  modelProbability: z.number().min(0).max(1),
  delta: z.number(),
  traceId: z.string().optional()
});

export async function POST(request: Request) {
  const body = schema.parse(await request.json());
  const trackedValidation = TrackedBetSchema.safeParse(body);
  if (!trackedValidation.success) {
    return NextResponse.json({ ok: false, error_code: 'schema_invalid', source: 'demo', degraded: true });
  }

  const store = getRuntimeStore();
  const emitter = new DbEventEmitter(store);
  const traceId = body.traceId ?? randomUUID();
  const runId = `prop_track_${randomUUID()}`;

  await store.saveTrackedProp({
    id: `tracked_${randomUUID()}`,
    gameId: body.gameId,
    propId: body.propId,
    player: body.player,
    market: body.market,
    line: body.line,
    modelProbability: body.modelProbability,
    delta: body.delta,
    trackedAt: new Date().toISOString()
  });

  await emitter.emit({
    event_name: 'prop_tracked',
    timestamp: new Date().toISOString(),
    request_id: randomUUID(),
    trace_id: traceId,
    run_id: runId,
    session_id: 'anon',
    user_id: null,
    agent_id: 'live-games',
    model_version: 'live-v0',
    properties: { game_id: body.gameId, prop_id: body.propId }
  });
  await emitter.emit({
    event_name: 'prop_edge_snapshot_created',
    timestamp: new Date().toISOString(),
    request_id: randomUUID(),
    trace_id: traceId,
    run_id: runId,
    session_id: 'anon',
    user_id: null,
    agent_id: 'live-games',
    model_version: 'live-v0',
    properties: { game_id: body.gameId, prop_id: body.propId, delta: body.delta }
  });

  return NextResponse.json({ ok: true, data: { tracked: true }, source: 'live', degraded: false });
}
