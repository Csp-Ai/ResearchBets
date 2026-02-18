import { randomUUID } from 'node:crypto';

import type { EventEmitter } from '../control-plane/emitter';
import type { RuntimeStore } from '../persistence/runtimeStore';
import { getRuntimeStore } from '../persistence/runtimeStoreProvider';
import { walConfig } from '../web/config';
import { findSources } from '../web/search';
import { acquireConsensusRecord } from '../web/consensus';

import type { MarketType } from './clv';

const DEDUPE_MS = 60_000;
const RESULT_FALLBACK_BUFFER_MS = 60_000;

export interface CaptureOddsInput {
  requestId: string;
  traceId: string;
  runId: string;
  sessionId: string;
  userId: string;
  agentId: string;
  modelVersion: string;
  gameId: string;
  market: string;
  marketType: MarketType;
  selection: string;
  line: number | null;
  price: number | null;
  book: string;
  capturedAt?: string;
  gameStartsAt?: string | null;
  sourceUrl?: string | null;
  sourceDomain?: string | null;
  fetchedAt?: string;
  publishedAt?: string | null;
  parserVersion?: string;
  checksum?: string;
  stalenessMs?: number;
  freshnessScore?: number;
  resolutionReason?: string | null;
  consensusLevel?: 'single_source' | 'two_source_agree' | 'three_source_agree' | 'conflict';
  sourcesUsed?: string[];
  disagreementScore?: number;
}

export const captureOddsSnapshot = async (
  input: CaptureOddsInput,
  emitter: EventEmitter,
  store: RuntimeStore = getRuntimeStore(),
): Promise<void> => {
  const capturedAt = input.capturedAt ?? new Date().toISOString();
  const snapshots = await store.listOddsSnapshots(input.gameId, input.market, input.selection);
  const latest = snapshots[0];
  if (latest && new Date(capturedAt).getTime() - new Date(latest.capturedAt).getTime() <= DEDUPE_MS) return;

  await store.saveOddsSnapshot({
    id: randomUUID(),
    gameId: input.gameId,
    market: input.market,
    marketType: input.marketType,
    selection: input.selection,
    line: input.line,
    price: input.price,
    book: input.book,
    capturedAt,
    gameStartsAt: input.gameStartsAt ?? null,
    sourceUrl: input.sourceUrl ?? null,
    sourceDomain: input.sourceDomain ?? null,
    fetchedAt: input.fetchedAt ?? capturedAt,
    publishedAt: input.publishedAt ?? null,
    parserVersion: input.parserVersion ?? walConfig.parserVersion,
    checksum: input.checksum ?? 'manual',
    stalenessMs: input.stalenessMs ?? 0,
    freshnessScore: input.freshnessScore ?? 1,
    resolutionReason: input.resolutionReason ?? null,
    consensusLevel: input.consensusLevel ?? 'single_source',
    sourcesUsed: input.sourcesUsed ?? (input.sourceDomain ? [input.sourceDomain] : []),
    disagreementScore: input.disagreementScore ?? 0,
  });

  await emitter.emit({
    event_name: 'odds_snapshot_captured',
    timestamp: new Date().toISOString(),
    request_id: input.requestId,
    trace_id: input.traceId,
    run_id: input.runId,
    session_id: input.sessionId,
    user_id: input.userId,
    agent_id: input.agentId,
    model_version: input.modelVersion,
    properties: {
      game_id: input.gameId,
      market: input.market,
      selection: input.selection,
      captured_at: capturedAt,
      source_url: input.sourceUrl ?? null,
      source_domain: input.sourceDomain ?? null,
      staleness_ms: input.stalenessMs ?? 0,
      consensus_level: input.consensusLevel ?? 'single_source',
      disagreement_score: input.disagreementScore ?? 0,
    },
  });
};

export const acquireAndCaptureOddsSnapshot = async (
  params: {
    sourceUrl: string;
    gameId: string;
    market: string;
    marketType: MarketType;
    selection: string;
    book?: string;
    gameStartsAt?: string | null;
    requestContext: { requestId: string; traceId: string; runId: string; sessionId: string; userId: string; agentId: string; modelVersion: string };
  },
  emitter: EventEmitter,
  store: RuntimeStore = getRuntimeStore(),
): Promise<void> => {
  const fallbackSource = { name: 'provided_source', domain: new URL(params.sourceUrl).hostname.toLowerCase(), url: params.sourceUrl, trust: 'official' as const };
  const sources = [fallbackSource, ...findSources({ sport: 'global', kind: 'odds' }).filter((item) => item.url !== params.sourceUrl)];
  const record = await acquireConsensusRecord({
    sources,
    dataType: 'odds',
    requestContext: params.requestContext,
    emitter,
    store,
  });

  if (!record) return;

  await captureOddsSnapshot(
    {
      ...params.requestContext,
      gameId: params.gameId,
      market: params.market,
      marketType: params.marketType,
      selection: params.selection,
      line: record.line ?? null,
      price: record.price ?? null,
      book: record.book ?? params.book ?? 'unknown_book',
      capturedAt: record.capturedAt ?? record.fetchedAt,
      gameStartsAt: params.gameStartsAt ?? null,
      sourceUrl: record.sourceUrl,
      sourceDomain: record.sourceDomain,
      fetchedAt: record.fetchedAt,
      publishedAt: record.publishedAt,
      parserVersion: record.parserVersion,
      checksum: record.checksum,
      stalenessMs: record.stalenessMs,
      freshnessScore: record.freshnessScore,
      consensusLevel: record.consensusLevel ?? 'single_source',
      sourcesUsed: record.sourcesUsed ?? [record.sourceDomain],
      disagreementScore: record.disagreementScore ?? 0,
    },
    emitter,
    store,
  );
};

export const refreshOddsSnapshotIfStale = async (
  params: {
    sourceUrl: string;
    gameId: string;
    market: string;
    marketType: MarketType;
    selection: string;
    book?: string;
    gameStartsAt?: string | null;
    requestContext: { requestId: string; traceId: string; runId: string; sessionId: string; userId: string; agentId: string; modelVersion: string };
  },
  emitter: EventEmitter,
  store: RuntimeStore = getRuntimeStore(),
): Promise<{ refreshed: boolean }> => {
  const snapshots = await store.listOddsSnapshots(params.gameId, params.market, params.selection);
  const latest = snapshots[0];
  if (latest) {
    const ageMs = Date.now() - new Date(latest.capturedAt).getTime();
    if (ageMs <= walConfig.oddsRefreshStalenessMs) return { refreshed: false };
  }
  await acquireAndCaptureOddsSnapshot(params, emitter, store);
  return { refreshed: true };
};

export const resolveClosingOdds = async ({
  gameId,
  market,
  selection,
  resultCompletedAt,
  requestContext,
  emitter,
  store = getRuntimeStore(),
}: {
  gameId: string;
  market: string;
  selection: string;
  resultCompletedAt?: string;
  requestContext: { requestId: string; traceId: string; runId: string; sessionId: string; userId: string; agentId: string; modelVersion: string };
  emitter: EventEmitter;
  store?: RuntimeStore;
}) => {
  const snapshots = await store.listOddsSnapshots(gameId, market, selection);
  if (snapshots.length === 0) return null;

  let closing = snapshots.find((item) => item.resolutionReason === 'closing' || item.resolutionReason === 'last_pre_start') ?? snapshots[0]!;
  let resolutionReason = closing.resolutionReason ?? 'explicit_closing';

  const withStart = snapshots.find((item) => item.gameStartsAt != null && new Date(item.capturedAt).getTime() <= new Date(item.gameStartsAt).getTime());
  if (withStart) {
    closing = withStart;
    resolutionReason = 'last_pre_start';
  } else if (resultCompletedAt) {
    const cutoff = new Date(resultCompletedAt).getTime() - RESULT_FALLBACK_BUFFER_MS;
    const beforeResult = snapshots.find((item) => new Date(item.capturedAt).getTime() <= cutoff);
    if (beforeResult) {
      closing = beforeResult;
      resolutionReason = 'last_before_result';
    }
  }

  if (closing.stalenessMs > walConfig.oddsStalenessMs) {
    await emitter.emit({
      event_name: 'agent_error',
      timestamp: new Date().toISOString(),
      request_id: requestContext.requestId,
      trace_id: requestContext.traceId,
      run_id: requestContext.runId,
      session_id: requestContext.sessionId,
      user_id: requestContext.userId,
      agent_id: requestContext.agentId,
      model_version: requestContext.modelVersion,
      properties: {
        status: 'error',
        error_code: 'stale_closing_odds',
        error_type: 'data_freshness',
        error_message: `closing snapshot stale: ${closing.stalenessMs}`,
        retryable: false,
      },
    });
    closing = { ...closing, resolutionReason: 'stale_fallback' };
  }

  await emitter.emit({
    event_name: 'snapshot_viewed',
    timestamp: new Date().toISOString(),
    request_id: requestContext.requestId,
    trace_id: requestContext.traceId,
    run_id: requestContext.runId,
    session_id: requestContext.sessionId,
    user_id: requestContext.userId,
    agent_id: requestContext.agentId,
    model_version: requestContext.modelVersion,
    properties: {
      snapshot_type: 'closing_odds',
      game_id: gameId,
      market,
      selection,
      captured_at: closing.capturedAt,
      resolution_reason: closing.resolutionReason ?? resolutionReason,
      consensus_level: closing.consensusLevel,
      disagreement_score: closing.disagreementScore,
    },
  });

  return { ...closing, resolutionReason: closing.resolutionReason ?? resolutionReason };
};
