import type { InsightGraphSummary, InsightNode } from './insightGraph';
import { summarizeInsightGraph } from './insightGraph';

export interface TransparencyReport {
  countsByInsightType: InsightGraphSummary['countsByType'];
  fragilityVariables: Array<{ insightId: string; claim: string; confidence: number; impactDelta: number }>;
  disagreementProxyByType: InsightGraphSummary['disagreementProxyByType'];
}

export function generateTransparencyReport(nodes: InsightNode[]): TransparencyReport {
  const summary = summarizeInsightGraph(nodes);
  return {
    countsByInsightType: summary.countsByType,
    fragilityVariables: summary.fragilityVariables.map((node) => ({
      insightId: node.insight_id,
      claim: node.claim,
      confidence: node.confidence,
      impactDelta: Number(Math.abs(node.delta ?? 0).toFixed(4)),
    })),
    disagreementProxyByType: summary.disagreementProxyByType,
  };
}
