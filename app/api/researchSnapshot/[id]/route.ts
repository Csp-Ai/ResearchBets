import { randomUUID } from 'node:crypto';

import { NextResponse } from 'next/server';

import { DbEventEmitter } from '@/src/core/control-plane/emitter';
import { DecisionCardV0Schema } from '@/src/core/contracts/terminalSchemas';
import { asMarketType } from '@/src/core/markets/marketType';
import { getRuntimeStore } from '@/src/core/persistence/runtimeStoreProvider';
import { buildPropLegInsight } from '@/src/core/slips/propInsights';

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

  const legs = snapshot.claims.slice(0, 4).map((claim) => ({
    selection: claim.text,
    market: asMarketType(claim.text, 'points'),
  }));

  const legInsights = legs.map((leg) => buildPropLegInsight(leg));
  const recommendations = snapshot.claims.map((claim) => ({
    id: claim.id,
    summary: claim.text,
    confidence: claim.confidence,
  }));

  const validatedRecommendations = recommendations.filter((recommendation) =>
    DecisionCardV0Schema.safeParse(recommendation).success
  );

  if (validatedRecommendations.length !== recommendations.length) {
    return NextResponse.json({
      ok: false,
      error_code: 'schema_invalid',
      source: 'cache',
      degraded: true,
      ...snapshot,
      legs,
      leg_insights: legInsights,
      recommendations: validatedRecommendations,
    });
  }

  return NextResponse.json({
    ...snapshot,
    legs,
    leg_insights: legInsights,
    recommendations: validatedRecommendations,
  });
}
