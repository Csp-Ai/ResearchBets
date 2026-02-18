import { createHash } from 'node:crypto';

import type { EvidenceItem } from '../evidence/evidenceSchema';

export type InsightType = 'injury' | 'line_move' | 'matchup_stat' | 'narrative' | 'weather' | 'market_delta' | 'correlated_risk';
export type InsightTrack = 'baseline' | 'hybrid';

export interface InsightEvidence { source: string; url?: string; snippet?: string }

export interface InsightNode {
  insight_id: string;
  trace_id: string;
  run_id: string;
  game_id: string;
  agent_key: string;
  track: InsightTrack;
  insight_type: InsightType;
  claim: string;
  evidence: InsightEvidence[];
  confidence: number;
  timestamp: string;
  decay_half_life_minutes: number;
  market_implied?: number;
  model_implied?: number;
  delta?: number;
}

export interface InsightGraphSummary {
  countsByType: Record<InsightType, number>;
  fragilityVariables: InsightNode[];
  disagreementProxyByType: Record<InsightType, number>;
}

const HALF_LIFE_BY_TYPE: Record<InsightType, number> = {
  injury: 90,
  line_move: 40,
  matchup_stat: 180,
  narrative: 240,
  weather: 120,
  market_delta: 45,
  correlated_risk: 60,
};

export function createInsightId(input: { gameId: string; agentKey: string; insightType: InsightType; timestamp: string }): string {
  const bucket = Math.floor(new Date(input.timestamp).getTime() / (5 * 60_000));
  const digest = createHash('sha256').update(`${input.gameId}:${input.agentKey}:${input.insightType}:${bucket}`).digest('hex').slice(0, 16);
  return `insight_${digest}`;
}

export function buildInsightNode(input: {
  traceId: string; runId: string; gameId: string; agentKey: string; track: InsightTrack; insightType: InsightType; claim: string; evidence?: InsightEvidence[]; confidence: number; timestamp?: string; marketImplied?: number; modelImplied?: number;
}): InsightNode {
  const timestamp = input.timestamp ?? new Date().toISOString();
  const delta = typeof input.modelImplied === 'number' && typeof input.marketImplied === 'number' ? Number((input.modelImplied - input.marketImplied).toFixed(4)) : undefined;
  return {
    insight_id: createInsightId({ gameId: input.gameId, agentKey: input.agentKey, insightType: input.insightType, timestamp }),
    trace_id: input.traceId,
    run_id: input.runId,
    game_id: input.gameId,
    agent_key: input.agentKey,
    track: input.track,
    insight_type: input.insightType,
    claim: input.claim,
    evidence: input.evidence ?? [],
    confidence: Math.max(0, Math.min(1, Number(input.confidence.toFixed(4)))),
    timestamp,
    decay_half_life_minutes: HALF_LIFE_BY_TYPE[input.insightType],
    market_implied: input.marketImplied,
    model_implied: input.modelImplied,
    delta,
  };
}

export function mapEvidenceToInsightEvidence(evidence: EvidenceItem[]): InsightEvidence[] {
  return evidence.slice(0, 2).map((item) => ({ source: item.sourceName, url: item.sourceUrl, snippet: item.contentExcerpt }));
}

export function summarizeInsightGraph(nodes: InsightNode[]): InsightGraphSummary {
  const countsByType = { injury: 0, line_move: 0, matchup_stat: 0, narrative: 0, weather: 0, market_delta: 0, correlated_risk: 0 } satisfies Record<InsightType, number>;
  for (const node of nodes) countsByType[node.insight_type] += 1;

  const fragilityVariables = [...nodes].sort((a, b) => ((1 - b.confidence) * (Math.abs(b.delta ?? 0.2) + 0.25)) - ((1 - a.confidence) * (Math.abs(a.delta ?? 0.2) + 0.25))).slice(0, 3);

  const disagreementProxyByType = Object.entries(countsByType).reduce((acc, [key]) => {
    const typedKey = key as InsightType;
    const confidences = nodes.filter((node) => node.insight_type === typedKey).map((node) => node.confidence);
    if (confidences.length < 2) { acc[typedKey] = 0; return acc; }
    const mean = confidences.reduce((sum, value) => sum + value, 0) / confidences.length;
    const variance = confidences.reduce((sum, value) => sum + (value - mean) ** 2, 0) / confidences.length;
    acc[typedKey] = Number(variance.toFixed(4));
    return acc;
  }, { injury: 0, line_move: 0, matchup_stat: 0, narrative: 0, weather: 0, market_delta: 0, correlated_risk: 0 } as Record<InsightType, number>);

  return { countsByType, fragilityVariables, disagreementProxyByType };
}
