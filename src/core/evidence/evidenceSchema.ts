export type EvidenceSourceType = 'odds' | 'injury' | 'stats' | 'news' | 'model' | 'other';

export interface EvidenceItem {
  id: string;
  sourceType: EvidenceSourceType;
  sourceName: string;
  sourceUrl?: string;
  retrievedAt: string;
  observedAt?: string;
  contentExcerpt: string;
  contentHash: string;
  licenseHint?: string;
  raw?: Record<string, unknown>;
  reliability?: number;
  tags?: string[];
  suspicious?: boolean;
}

export interface Claim {
  id: string;
  text: string;
  confidence: number;
  rationale: string;
  evidenceIds: string[];
}

export interface ResearchReport {
  reportId: string;
  runId: string;
  traceId: string;
  createdAt: string;
  subject: string;
  claims: Claim[];
  evidence: EvidenceItem[];
  summary: string;
  confidenceSummary: {
    averageClaimConfidence: number;
    deterministic: true;
  };
  risks: string[];
  assumptions: string[];
  transparency?: {
    countsByInsightType: Record<string, number>;
    fragilityVariables: Array<{ insightId: string; claim: string; confidence: number; impactDelta: number }>;
    disagreementProxyByType: Record<string, number>;
  };
}
