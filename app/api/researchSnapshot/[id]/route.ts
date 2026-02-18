import { randomUUID } from 'node:crypto';

import { NextResponse } from 'next/server';

import { DbEventEmitter } from '@/src/core/control-plane/emitter';
import { getRuntimeStore } from '@/src/core/persistence/runtimeStoreProvider';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const store = getRuntimeStore();
  const snapshot = await store.getSnapshot(params.id);
  if (!snapshot) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await new DbEventEmitter(store).emit({
    event_name: 'snapshot_viewed',
    timestamp: new Date().toISOString(),
    request_id: randomUUID(),
    trace_id: snapshot.traceId,
    run_id: snapshot.runId,
    session_id: 'server',
    user_id: 'server',
    agent_id: 'research_snapshot',
    model_version: 'runtime-deterministic-v1',
    properties: { snapshot_id: snapshot.reportId },
  });

  return NextResponse.json(snapshot);
}
