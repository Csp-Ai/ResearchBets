import { randomUUID } from 'node:crypto';

import type { EventEmitter } from '../control-plane/emitter';
import type { RuntimeStore } from '../persistence/runtimeStore';
import { getRuntimeStore } from '../persistence/runtimeStoreProvider';
import { walConfig } from '../web/config';
import { acquireWebData } from '../web/index';

export const ingestGameResult = async (
  gameId: string,
  payload: Record<string, unknown>,
  requestContext: {
    requestId: string;
    traceId: string;
    runId: string;
    sessionId: string;
    userId: string;
    agentId: string;
    modelVersion: string;
  },
  emitter: EventEmitter,
  store: RuntimeStore = getRuntimeStore(),
): Promise<void> => {
  const completedAt = (payload.completed_at as string | undefined) ?? new Date().toISOString();
  const isFinal = Boolean(payload.is_final ?? payload.final ?? false);
  await store.saveGameResult({
    id: randomUUID(),
    gameId,
    payload,
    completedAt,
    createdAt: new Date().toISOString(),
    isFinal,
    sourceUrl: (payload.source_url as string | undefined) ?? null,
    sourceDomain: (payload.source_domain as string | undefined) ?? null,
    fetchedAt: (payload.fetched_at as string | undefined) ?? new Date().toISOString(),
    publishedAt: (payload.published_at as string | undefined) ?? null,
    parserVersion: (payload.parser_version as string | undefined) ?? walConfig.parserVersion,
    checksum: (payload.checksum as string | undefined) ?? 'manual',
    stalenessMs: Number(payload.staleness_ms ?? 0),
    freshnessScore: Number(payload.freshness_score ?? 1),
  });

  await emitter.emit({
    event_name: 'game_result_ingested',
    timestamp: new Date().toISOString(),
    request_id: requestContext.requestId,
    trace_id: requestContext.traceId,
    run_id: requestContext.runId,
    session_id: requestContext.sessionId,
    user_id: requestContext.userId,
    agent_id: requestContext.agentId,
    model_version: requestContext.modelVersion,
    properties: {
      outcome_id: `result_${gameId}`,
      bet_id: gameId,
      settlement_status: isFinal ? 'ready' : 'provisional',
      pnl_amount: 0,
      settled_at: completedAt,
      is_final: isFinal,
    },
  });
};

export const acquireAndIngestGameResult = async (
  {
    sourceUrl,
    gameId,
    requestContext,
  }: {
    sourceUrl: string;
    gameId: string;
    requestContext: { requestId: string; traceId: string; runId: string; sessionId: string; userId: string; agentId: string; modelVersion: string };
  },
  emitter: EventEmitter,
  store: RuntimeStore = getRuntimeStore(),
): Promise<void> => {
  const wal = await acquireWebData({
    request: { url: sourceUrl, dataType: 'results', parserHint: 'json', maxStalenessMs: walConfig.resultsStalenessMs },
    requestContext,
    emitter,
    store,
  });

  const record = wal.records[0];
  if (!record) return;
  await ingestGameResult(
    gameId,
    {
      ...(record.payload ?? {}),
      completed_at: record.completedAt,
      is_final: record.isFinal,
      source_url: record.sourceUrl,
      source_domain: record.sourceDomain,
      fetched_at: record.fetchedAt,
      published_at: record.publishedAt,
      parser_version: record.parserVersion,
      checksum: record.checksum,
      staleness_ms: record.stalenessMs,
      freshness_score: record.freshnessScore,
    },
    requestContext,
    emitter,
    store,
  );
};
