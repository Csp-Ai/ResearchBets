import { createHash, randomUUID } from 'node:crypto';

import type { EventEmitter } from '../control-plane/emitter';
import type { RuntimeStore, StoredBet } from '../persistence/runtimeStore';
import { getRuntimeStore } from '../persistence/runtimeStoreProvider';

const bucketConfidence = (confidence: number): string => {
  if (confidence >= 0.8) return '0.8-1.0';
  if (confidence >= 0.6) return '0.6-0.79';
  return '0.0-0.59';
};

const avg = (values: number[]): number | null => (values.length ? Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(6)) : null);
const median = (values: number[]): number | null => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? Number((((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2).toFixed(6)) : Number((sorted[mid] ?? 0).toFixed(6));
};

const filterWindow = (bets: StoredBet[], window: string): StoredBet[] => {
  const days = Number(window.replace('d', ''));
  const now = Date.now();
  return bets.filter((bet) => now - new Date(bet.createdAt).getTime() <= days * 86_400_000);
};

const stderrCI = (a: number[], b: number[]): { lower: number; upper: number } | null => {
  if (!a.length || !b.length) return null;
  const meanA = avg(a) ?? 0;
  const meanB = avg(b) ?? 0;
  const varA = a.reduce((s, v) => s + (v - meanA) ** 2, 0) / Math.max(1, a.length - 1);
  const varB = b.reduce((s, v) => s + (v - meanB) ** 2, 0) / Math.max(1, b.length - 1);
  const se = Math.sqrt(varA / a.length + varB / b.length);
  const delta = meanA - meanB;
  return { lower: Number((delta - 1.96 * se).toFixed(6)), upper: Number((delta + 1.96 * se).toFixed(6)) };
};

export const assignExperiment = async (
  { name, userId, anonSessionId }: { name: string; userId?: string | null; anonSessionId?: string | null },
  store: RuntimeStore = getRuntimeStore(),
): Promise<{ assignment: 'control' | 'treatment'; subjectKey: string }> => {
  const subjectKey = userId ?? anonSessionId ?? 'anonymous';
  const existing = await store.getExperimentAssignment(name, subjectKey);
  if (existing) return { assignment: existing.assignment, subjectKey };
  if (!(await store.getExperiment(name))) await store.saveExperiment({ id: randomUUID(), name, description: null, createdAt: new Date().toISOString() });
  const asInt = Number.parseInt(createHash('sha256').update(`${name}:${subjectKey}`).digest('hex').slice(0, 8), 16);
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
  const makeStats = (bets: StoredBet[]) => {
    const line = bets.map((b) => b.clvLine).filter((v): v is number => v != null);
    const price = bets.map((b) => b.clvPrice).filter((v): v is number => v != null);
    return { n: bets.length, mean_clv_line: avg(line), median_clv_line: median(line), mean_clv_price: avg(price), median_clv_price: median(price) };
  };
  const followedStats = makeStats(followed);
  const notFollowedStats = makeStats(notFollowed);

  const resultsByDomain: Record<string, number> = {};
  let staleDataOccurrences = 0;
  let authoritativeClosing = 0;
  let fallbackClosing = 0;
  for (const bet of allBets) {
    if (bet.sourceDomain) resultsByDomain[bet.sourceDomain] = (resultsByDomain[bet.sourceDomain] ?? 0) + 1;
    if ((bet.resolutionReason ?? '').includes('fallback') || (bet.resolutionReason ?? '').includes('last_')) fallbackClosing += 1;
    else if (bet.closingLine != null || bet.closingPrice != null) authoritativeClosing += 1;
    if ((bet.resolutionReason ?? '').includes('stale')) staleDataOccurrences += 1;
  }

  const lineCI = stderrCI(
    followed.map((b) => b.clvLine).filter((v): v is number => v != null),
    notFollowed.map((b) => b.clvLine).filter((v): v is number => v != null),
  );

  const report = {
    window,
    methodology: 'normal_approximation_95ci',
    followed: followedStats,
    not_followed: notFollowedStats,
    delta: {
      clv_line: Number(((followedStats.mean_clv_line ?? 0) - (notFollowedStats.mean_clv_line ?? 0)).toFixed(6)),
      clv_price: Number(((followedStats.mean_clv_price ?? 0) - (notFollowedStats.mean_clv_price ?? 0)).toFixed(6)),
      clv_line_ci_95: lineCI,
    },
    data_quality: {
      authoritative_closing_odds_pct: allBets.length ? Number(((authoritativeClosing / allBets.length) * 100).toFixed(2)) : 0,
      fallback_closing_odds_pct: allBets.length ? Number(((fallbackClosing / allBets.length) * 100).toFixed(2)) : 0,
      results_by_domain_pct: Object.fromEntries(
        Object.entries(resultsByDomain).map(([domain, count]) => [domain, Number(((count / Math.max(1, allBets.length)) * 100).toFixed(2))]),
      ),
      stale_data_occurrences: staleDataOccurrences,
    },
    cohort_sizes: { total: allBets.length, followed: followed.length, not_followed: notFollowed.length },
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
    properties: { window, bet_count: allBets.length, has_data_quality: true },
  });
  return report;
};

export const generateEdgeScorecard = async (store: RuntimeStore = getRuntimeStore()): Promise<Record<string, unknown>> => {
  const bets = await store.listBets('settled');
  const byBucket = ['0.0-0.59', '0.6-0.79', '0.8-1.0'].map((bucket) => {
    const filtered = bets.filter((bet) => bucketConfidence(bet.confidence) === bucket);
    const wins = filtered.filter((bet) => bet.outcome === 'won').length;
    return { confidence_bucket: bucket, win_rate: filtered.length ? Number((wins / filtered.length).toFixed(6)) : null, n: filtered.length };
  });

  const byAgent = Object.entries(
    bets.reduce<Record<string, StoredBet[]>>((acc, bet) => {
      const key = bet.recommendedId ?? 'unknown_agent';
      acc[key] = acc[key] ?? [];
      acc[key].push(bet);
      return acc;
    }, {}),
  ).map(([agentId, agentBets]) => {
    const probs = agentBets.map((bet) => bet.confidence);
    const outcomes = agentBets.map((bet) => (bet.outcome === 'won' ? 1 : 0));
    const brier = probs.reduce((sum, p, idx) => sum + (p - outcomes[idx]!) ** 2, 0) / Math.max(1, probs.length);
    return { agent_id: agentId, brier_score: Number(brier.toFixed(6)), n: agentBets.length };
  });

  return { win_rate_by_confidence_bucket: byBucket, brier_by_agent_id: byAgent };
};
