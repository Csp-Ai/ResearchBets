import { randomUUID } from 'node:crypto';

import { NextResponse } from 'next/server';
import { z } from 'zod';

import { DbEventEmitter } from '@/src/core/control-plane/emitter';
import { applyRateLimit } from '@/src/core/http/rateLimit';
import { asMarketType } from '@/src/core/markets/marketType';
import { buildResearchSnapshot } from '@/src/flows/researchSnapshot/buildResearchSnapshot';
import { getRuntimeStore } from '@/src/core/persistence/runtimeStoreProvider';

const payloadSchema = z.object({
  subject: z.string().trim().min(3).max(240),
  sessionId: z.string().trim().min(1).max(120),
  userId: z.string().trim().min(1).max(120).optional(),
  tier: z.enum(['free', 'premium']).optional(),
  seed: z.string().trim().max(120).optional(),
  marketType: z.string().trim().max(40).optional(),
  requestId: z.string().trim().max(120).optional()
});

export async function POST(request: Request) {
  const limited = applyRateLimit(request, { route: 'researchSnapshot:start', limit: 10 });
  if (limited) return limited;

  const parsed = payloadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid research request payload.' }, { status: 400 });

  const body = parsed.data;

  const requestId = body.requestId ?? randomUUID();
  const runId = randomUUID();
  const traceId = randomUUID();
  const store = getRuntimeStore();
  const emitter = new DbEventEmitter(store);

  const report = await buildResearchSnapshot(
    {
      subject: body.subject,
      sessionId: body.sessionId,
      userId: body.userId ?? body.sessionId,
      tier: body.tier ?? 'free',
      environment: process.env.NODE_ENV === 'production' ? 'prod' : 'dev',
      seed: body.seed ?? 'demo-seed',
      requestId,
      traceId,
      runId,
      marketType: asMarketType(body.marketType, 'points'),
    },
    emitter,
    process.env,
    store,
  );

  return NextResponse.json({ status: 'accepted', requestId, jobId: runId, traceId, runId, snapshotId: report.reportId });
}
