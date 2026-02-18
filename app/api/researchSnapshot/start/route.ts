import { randomUUID } from 'node:crypto';

import { NextResponse } from 'next/server';

import { DbEventEmitter } from '@/src/core/control-plane/emitter';
import { persistenceDb } from '@/src/core/persistence/runtimeDb';
import { buildResearchSnapshot } from '@/src/flows/researchSnapshot/buildResearchSnapshot';

export async function POST(request: Request) {
  const body = (await request.json()) as {
    subject: string;
    sessionId: string;
    userId: string;
    tier?: 'free' | 'premium';
    seed?: string;
  };

  const runId = randomUUID();
  const traceId = randomUUID();
  const emitter = new DbEventEmitter();

  await emitter.emit({
    eventName: 'RUN_ACCEPTED',
    timestamp: new Date().toISOString(),
    traceId,
    runId,
    sessionId: body.sessionId,
    userId: body.userId,
    properties: { subject: body.subject },
  });

  const report = await buildResearchSnapshot(
    {
      subject: body.subject,
      sessionId: body.sessionId,
      userId: body.userId,
      tier: body.tier ?? 'free',
      environment: process.env.NODE_ENV === 'production' ? 'prod' : 'dev',
      seed: body.seed ?? 'demo-seed',
      traceId,
      runId,
    },
    emitter,
  );

  persistenceDb.snapshots.unshift(report);

  await emitter.emit({
    eventName: 'SNAPSHOT_SAVED',
    timestamp: new Date().toISOString(),
    traceId,
    runId,
    sessionId: body.sessionId,
    userId: body.userId,
    properties: { snapshotId: report.reportId },
  });

  return NextResponse.json({ status: 'accepted', jobId: runId, traceId, runId, snapshotId: report.reportId });
}
