import { randomUUID } from 'node:crypto';

import { NextResponse } from 'next/server';

import { DbEventEmitter } from '@/src/core/control-plane/emitter';
import { generateEdgeReport } from '@/src/core/measurement/edge';
import { getRuntimeStore } from '@/src/core/persistence/runtimeStoreProvider';

export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const store = getRuntimeStore();
  const { searchParams } = new URL(request.url);
  const window = searchParams.get('window') ?? '30d';
  const emitter = new DbEventEmitter(store);
  const report = await generateEdgeReport(
    {
      window,
      requestContext: {
        requestId: randomUUID(),
        traceId: randomUUID(),
        runId: randomUUID(),
        sessionId: 'system',
        userId: 'system',
        agentId: 'edge_reporter',
        modelVersion: 'runtime-deterministic-v1',
      },
      emitter,
    },
    store,
  );
  return NextResponse.json(report);
}
