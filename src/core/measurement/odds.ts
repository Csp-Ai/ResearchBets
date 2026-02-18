import { randomUUID } from 'node:crypto';

import type { EventEmitter } from '../control-plane/emitter';
import type { RuntimeStore } from '../persistence/runtimeStore';
import { getRuntimeStore } from '../persistence/runtimeStoreProvider';

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
}

export const captureOddsSnapshot = async (
  input: CaptureOddsInput,
  emitter: EventEmitter,
  store: RuntimeStore = getRuntimeStore(),
): Promise<void> => {
  const capturedAt = input.capturedAt ?? new Date().toISOString();
  const snapshots = await store.listOddsSnapshots(input.gameId, input.market, input.selection);
  const latest = snapshots[0];
  if (latest && new Date(capturedAt).getTime() - new Date(latest.capturedAt).getTime() <= DEDUPE_MS) {
    return;
  }

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
  });

  await emitter.emit({
    event_name: 'snapshot_saved',
    timestamp: new Date().toISOString(),
    request_id: input.requestId,
    trace_id: input.traceId,
    run_id: input.runId,
    session_id: input.sessionId,
    user_id: input.userId,
    agent_id: input.agentId,
    model_version: input.modelVersion,
    properties: {
      snapshot_type: 'odds',
      game_id: input.gameId,
      market: input.market,
      selection: input.selection,
      captured_at: capturedAt,
    },
  });
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
  requestContext: {
    requestId: string;
    traceId: string;
    runId: string;
    sessionId: string;
    userId: string;
    agentId: string;
    modelVersion: string;
  };
  emitter: EventEmitter;
  store?: RuntimeStore;
}) => {
  const snapshots = await store.listOddsSnapshots(gameId, market, selection);
  if (snapshots.length === 0) return null;

  let closing = snapshots[0]!;
  const withStart = snapshots.find((item) => item.gameStartsAt != null && new Date(item.capturedAt).getTime() <= new Date(item.gameStartsAt).getTime());
  if (withStart) {
    closing = withStart;
  } else if (resultCompletedAt) {
    const cutoff = new Date(resultCompletedAt).getTime() - RESULT_FALLBACK_BUFFER_MS;
    const beforeResult = snapshots.find((item) => new Date(item.capturedAt).getTime() <= cutoff);
    if (beforeResult) closing = beforeResult;
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
    },
  });

  return closing;
};
