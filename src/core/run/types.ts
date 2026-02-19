export type ProviderMode = 'live' | 'fallback';

export interface ExtractedLeg {
  id: string;
  selection: string;
  market?: string;
  line?: string;
  odds?: string;
  team?: string;
  player?: string;
  sport?: string;
  eventTime?: string;
  book?: string;
}

export interface EnrichedLeg {
  extractedLegId: string;
  l5: number;
  l10: number;
  season?: number;
  vsOpp?: number;
  riskScore?: number;
  riskBand?: 'low' | 'moderate' | 'high';
  riskFactors?: string[];
  dataSources?: {
    stats: ProviderMode;
    injuries: ProviderMode;
    odds: ProviderMode;
  };
  flags: {
    injury?: string | null;
    news?: string | null;
    lineMove?: number | null;
    divergence?: number | null;
  };
  evidenceNotes: string[];
}

export interface VerdictAnalysis {
  confidencePct: number;
  weakestLegId: string | null;
  reasons: string[];
  riskLabel: 'Strong' | 'Caution' | 'Weak';
  computedAt: string;
}

export interface SourceStats {
  stats: ProviderMode;
  injuries: ProviderMode;
  odds: ProviderMode;
}

export interface Run {
  traceId: string;
  createdAt: string;
  updatedAt: string;
  status: 'running' | 'complete' | 'failed';
  slipText: string;
  extractedLegs: ExtractedLeg[];
  enrichedLegs: EnrichedLeg[];
  analysis: VerdictAnalysis;
  sources: SourceStats;
  metadata?: {
    originalSlipText?: string;
    crowdNotes?: string;
  };
}
