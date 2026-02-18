import type { InsightGraphSummary, InsightNode } from './insightGraph';
import { summarizeInsightGraph } from './insightGraph';

export interface TransparencyReport {
  countsByInsightType: InsightGraphSummary['countsByType'];
  fragilityVariables: Array<{
    insightId: string;
    claim: string;
    confidence: number;
    impactDelta: number;
  }>;
  disagreementProxyByType: InsightGraphSummary['disagreementProxyByType'];
  performance: {
    edges_total: number;
    edges_confirmed: number;
    edges_missed: number;
    calibration_score: number;
    avg_delta: number;
    disagreement_rate: number;
  };
}

export function generateTransparencyReport(nodes: InsightNode[]): TransparencyReport {
  const summary = summarizeInsightGraph(nodes);
  return {
    countsByInsightType: summary.countsByType,
    fragilityVariables: summary.fragilityVariables.map((node) => ({
      insightId: node.insight_id,
      claim: node.claim,
      confidence: node.confidence,
      impactDelta: Number(Math.abs(node.delta ?? 0).toFixed(4))
    })),
    disagreementProxyByType: summary.disagreementProxyByType,
    performance: {
      edges_total: summary.countsByType.edge_realized ?? 0,
      edges_confirmed: nodes.filter(
        (node) => node.insight_type === 'edge_realized' && (node.delta ?? 0) >= 0
      ).length,
      edges_missed: nodes.filter(
        (node) => node.insight_type === 'edge_realized' && (node.delta ?? 0) < 0
      ).length,
      calibration_score: Number(
        (1 - (summary.disagreementProxyByType.calibration_update ?? 0)).toFixed(4)
      ),
      avg_delta: Number(
        (
          nodes
            .filter((node) => typeof node.delta === 'number')
            .reduce((sum, node) => sum + Math.abs(node.delta ?? 0), 0) /
          Math.max(1, nodes.filter((node) => typeof node.delta === 'number').length)
        ).toFixed(4)
      ),
      disagreement_rate: Number(
        (
          Object.values(summary.disagreementProxyByType).reduce((sum, value) => sum + value, 0) /
          Math.max(1, Object.values(summary.disagreementProxyByType).length)
        ).toFixed(4)
      )
    }
  };
}
