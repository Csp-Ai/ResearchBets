import { randomUUID } from 'node:crypto';

import { NextResponse } from 'next/server';

import { DbEventEmitter } from '@/src/core/control-plane/emitter';
import { buildResearchSnapshot } from '@/src/flows/researchSnapshot/buildResearchSnapshot';
import { getRuntimeStore } from '@/src/core/persistence/runtimeStoreProvider';

export async function POST(request: Request) {
  const body = (await request.json()) as {
    subject: string;
    sessionId: string;
    userId: string;
    tier?: 'free' | 'premium';
    seed?: string;
  };

  const requestId = randomUUID();
  const runId = randomUUID();
  const traceId = randomUUID();
  const store = getRuntimeStore();
  const emitter = new DbEventEmitter(store);

  const report = await buildResearchSnapshot(
    {
      subject: body.subject,
      sessionId: body.sessionId,
      userId: body.userId,
      tier: body.tier ?? 'free',
      environment: process.env.NODE_ENV === 'production' ? 'prod' : 'dev',
      seed: body.seed ?? 'demo-seed',
      requestId,
      traceId,
      runId,
    },
    emitter,
    process.env,
    store,
  );

  return NextResponse.json({ status: 'accepted', requestId, jobId: runId, traceId, runId, snapshotId: report.reportId });
}
