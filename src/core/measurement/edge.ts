import { createHash, randomUUID } from 'node:crypto';

import type { EventEmitter } from '../control-plane/emitter';
import type { RuntimeStore, StoredBet } from '../persistence/runtimeStore';
import { getRuntimeStore } from '../persistence/runtimeStoreProvider';

const bucketConfidence = (confidence: number): string => {
  if (confidence >= 0.8) return '0.8-1.0';
  if (confidence >= 0.6) return '0.6-0.79';
  return '0.0-0.59';
};

const avg = (values: number[]): number | null => {
  if (values.length === 0) return null;
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(6));
};

const filterWindow = (bets: StoredBet[], window: string): StoredBet[] => {
  const days = Number(window.replace('d', ''));
  const now = Date.now();
  return bets.filter((bet) => now - new Date(bet.createdAt).getTime() <= days * 86_400_000);
};

export const assignExperiment = async (
  {
    name,
    userId,
    anonSessionId,
  }: {
    name: string;
    userId?: string | null;
    anonSessionId?: string | null;
  },
  store: RuntimeStore = getRuntimeStore(),
): Promise<{ assignment: 'control' | 'treatment'; subjectKey: string }> => {
  const subjectKey = userId ?? anonSessionId ?? 'anonymous';
  const existing = await store.getExperimentAssignment(name, subjectKey);
  if (existing) {
    return { assignment: existing.assignment, subjectKey };
  }

  if (!(await store.getExperiment(name))) {
    await store.saveExperiment({ id: randomUUID(), name, description: null, createdAt: new Date().toISOString() });
  }

  const hash = createHash('sha256').update(`${name}:${subjectKey}`).digest('hex');
  const asInt = Number.parseInt(hash.slice(0, 8), 16);
  const assignment = asInt % 2 === 0 ? 'control' : 'treatment';

  await store.saveExperimentAssignment({
    id: randomUUID(),
    experimentName: name,
    assignment,
    subjectKey,
    userId: userId ?? null,
    anonSessionId: anonSessionId ?? null,
    createdAt: new Date().toISOString(),
  });

  return { assignment, subjectKey };
};

export const generateEdgeReport = async (
  {
    window,
    requestContext,
    emitter,
  }: {
    window: string;
    requestContext: { requestId: string; traceId: string; runId: string; sessionId: string; userId: string; agentId: string; modelVersion: string };
    emitter: EventEmitter;
  },
  store: RuntimeStore = getRuntimeStore(),
): Promise<Record<string, unknown>> => {
  const allBets = filterWindow(await store.listBets(), window);
  const followed = allBets.filter((bet) => bet.followedAi || !!bet.recommendedId);
  const notFollowed = allBets.filter((bet) => !(bet.followedAi || !!bet.recommendedId));

  const makeStats = (bets: StoredBet[]) => ({
    avg_clv_line: avg(bets.map((bet) => bet.clvLine).filter((value): value is number => value != null)),
    avg_clv_price: avg(bets.map((bet) => bet.clvPrice).filter((value): value is number => value != null)),
    count: bets.length,
  });

  const byMarketType = ['spread', 'total', 'moneyline'].map((marketType) => ({
    market_type: marketType,
    followed: makeStats(followed.filter((bet) => bet.marketType === marketType)),
    not_followed: makeStats(notFollowed.filter((bet) => bet.marketType === marketType)),
  }));

  const byConfidence = ['0.0-0.59', '0.6-0.79', '0.8-1.0'].map((bucket) => ({
    confidence_bucket: bucket,
    followed: makeStats(followed.filter((bet) => bucketConfidence(bet.confidence) === bucket)),
    not_followed: makeStats(notFollowed.filter((bet) => bucketConfidence(bet.confidence) === bucket)),
  }));

  const deltaLine = (makeStats(followed).avg_clv_line ?? 0) - (makeStats(notFollowed).avg_clv_line ?? 0);
  const deltaPrice = (makeStats(followed).avg_clv_price ?? 0) - (makeStats(notFollowed).avg_clv_price ?? 0);

  const report = {
    window,
    followed: makeStats(followed),
    not_followed: makeStats(notFollowed),
    delta: {
      clv_line: Number(deltaLine.toFixed(6)),
      clv_price: Number(deltaPrice.toFixed(6)),
    },
    breakdown: {
      by_market_type: byMarketType,
      by_confidence_bucket: byConfidence,
    },
  };

  await emitter.emit({
    event_name: 'edge_report_generated',
    timestamp: new Date().toISOString(),
    request_id: requestContext.requestId,
    trace_id: requestContext.traceId,
    run_id: requestContext.runId,
    session_id: requestContext.sessionId,
    user_id: requestContext.userId,
    agent_id: requestContext.agentId,
    model_version: requestContext.modelVersion,
    properties: { window, bet_count: allBets.length },
  });

  return report;
};
