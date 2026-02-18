import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';

import { InMemoryEventEmitter } from '../../../../core/control-plane/emitter';
import { generateEdgeReport } from '../../../../core/measurement/edge';

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const window = searchParams.get('window') ?? '30d';
  const report = await generateEdgeReport({
    window,
    requestContext: {
      requestId: randomUUID(),
      traceId: randomUUID(),
      runId: randomUUID(),
      sessionId: 'edge_report_api',
      userId: 'system',
      agentId: 'edge_service',
      modelVersion: 'wal-v1',
    },
    emitter: new InMemoryEventEmitter(),
  });

  return NextResponse.json(report);
}
