import type { MarketType } from '../markets/marketType';

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

export interface SourceReference {
  provider: string;
  url: string;
  retrievedAt: string;
}

export interface PlatformLineFact {
  platform: string;
  marketType: MarketType;
  player: string;
  line: number;
  odds?: number;
  payout?: number;
  asOf: string;
  sources: SourceReference[];
}

export interface LegHitProfile {
  selection: string;
  marketType: MarketType;
  hitRate: {
    l5: number;
    l10: number;
    seasonAvg: number;
    vsOpponent?: number;
  };
  lineContext: {
    platformLines: PlatformLineFact[];
    consensusLine: number | null;
    divergence: {
      spread: number;
      warning: boolean;
      bestLine?: PlatformLineFact;
      worstLine?: PlatformLineFact;
    };
  };
  verdict: {
    score: number;
    label: 'Strong' | 'Lean' | 'Pass';
    riskTag: 'Low' | 'Medium' | 'High';
  };
  fallbackReason?: string;
  provenance: {
    asOf: string;
    sources: SourceReference[];
  };
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
  legs?: Array<{ selection: string; market?: string; odds?: string; team?: string; gameId?: string }>;
  legHitProfiles?: LegHitProfile[];
  transparency?: {
    countsByInsightType: Record<string, number>;
    fragilityVariables: Array<{
      insightId: string;
      claim: string;
      confidence: number;
      impactDelta: number;
    }>;
    disagreementProxyByType: Record<string, number>;
    performance?: {
      edges_total: number;
      edges_confirmed: number;
      edges_missed: number;
      calibration_score: number;
      avg_delta: number;
      disagreement_rate: number;
    };
  };
}
