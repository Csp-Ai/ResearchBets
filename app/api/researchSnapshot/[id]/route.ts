import { NextResponse } from 'next/server';

import { DbEventEmitter } from '@/src/core/control-plane/emitter';
import { persistenceDb } from '@/src/core/persistence/runtimeDb';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const snapshot = persistenceDb.snapshots.find((item) => item.reportId === params.id);
  if (!snapshot) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await new DbEventEmitter().emit({
    eventName: 'SNAPSHOT_VIEWED',
    timestamp: new Date().toISOString(),
    traceId: snapshot.traceId,
    runId: snapshot.runId,
    sessionId: 'server',
    userId: 'server',
    properties: { snapshotId: snapshot.reportId },
  });

  return NextResponse.json(snapshot);
}
