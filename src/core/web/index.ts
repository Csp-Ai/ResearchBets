import { createHash } from 'node:crypto';

import type { EventEmitter } from '../control-plane/emitter';
import type { RuntimeStore } from '../persistence/runtimeStore';

import { fetchWithCache } from './fetcher';
import { normalizeRecords } from './normalize';
import { parseBody } from './parser';
import type { WalAcquireResponse, WalRequest } from './types';

export const acquireWebData = async ({
  request,
  requestContext,
  emitter,
  store,
}: {
  request: WalRequest;
  requestContext: { requestId: string; traceId: string; runId: string; sessionId: string; userId: string; agentId: string; modelVersion: string };
  emitter: EventEmitter;
  store: RuntimeStore;
}): Promise<WalAcquireResponse> => {
  await emitter.emit({
    event_name: 'external_fetch_started',
    timestamp: new Date().toISOString(),
    request_id: requestContext.requestId,
    trace_id: requestContext.traceId,
    run_id: requestContext.runId,
    session_id: requestContext.sessionId,
    user_id: requestContext.userId,
    agent_id: requestContext.agentId,
    model_version: requestContext.modelVersion,
    properties: { url: request.url, data_type: request.dataType },
  });

  try {
    const fetched = await fetchWithCache(request.url, store);
    const parsed = parseBody(fetched.body, request.parserHint);
    const records = normalizeRecords({
      dataType: request.dataType,
      parsed,
      fetchedAt: fetched.fetchedAt,
      sourceUrl: request.url,
      sourceDomain: fetched.domain,
      parserVersion: process.env.WAL_PARSER_VERSION,
      checksum: createHash('sha256').update(fetched.body).digest('hex'),
      maxStalenessMs: request.maxStalenessMs,
    });
    const stale = records.some((record) => record.stalenessMs > request.maxStalenessMs);

    await emitter.emit({
      event_name: 'external_fetch_completed',
      timestamp: new Date().toISOString(),
      request_id: requestContext.requestId,
      trace_id: requestContext.traceId,
      run_id: requestContext.runId,
      session_id: requestContext.sessionId,
      user_id: requestContext.userId,
      agent_id: requestContext.agentId,
      model_version: requestContext.modelVersion,
      properties: { url: request.url, data_type: request.dataType, record_count: records.length, stale },
    });

    await emitter.emit({
      event_name: 'data_normalized',
      timestamp: new Date().toISOString(),
      request_id: requestContext.requestId,
      trace_id: requestContext.traceId,
      run_id: requestContext.runId,
      session_id: requestContext.sessionId,
      user_id: requestContext.userId,
      agent_id: requestContext.agentId,
      model_version: requestContext.modelVersion,
      properties: { data_type: request.dataType, stale },
    });

    return {
      records,
      stale,
      provenance: {
        url: request.url,
        domain: fetched.domain,
        fetchedAt: fetched.fetchedAt,
        publishedAt: records[0]?.publishedAt ?? null,
        parserVersion: records[0]?.parserVersion ?? 'wal-v1',
        checksum: records[0]?.checksum ?? fetched.contentHash,
        status: fetched.status,
        etag: fetched.etag,
      },
    };
  } catch (error) {
    await emitter.emit({
      event_name: 'external_fetch_failed',
      timestamp: new Date().toISOString(),
      request_id: requestContext.requestId,
      trace_id: requestContext.traceId,
      run_id: requestContext.runId,
      session_id: requestContext.sessionId,
      user_id: requestContext.userId,
      agent_id: requestContext.agentId,
      model_version: requestContext.modelVersion,
      properties: { url: request.url, data_type: request.dataType, error: error instanceof Error ? error.message : String(error) },
    });
    throw error;
  }
};
