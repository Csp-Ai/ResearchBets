import type { TrustedContextBundle } from '@/src/core/context/types';
import type { SlipStructureReport } from '@/src/core/contracts/slipStructureReport';

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
  matchup?: string;
  game_id?: string;
  event_id?: string;
  home?: string;
  away?: string;
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
  riskLabel: 'Strong' | 'Solid' | 'Thin' | 'Fragile';
  computedAt: string;
  dataQuality?: {
    trustedCoverage: 'live' | 'fallback' | 'none';
    hasUnverified: boolean;
    confidenceCapReason?: string;
  };
}

export interface SourceStats {
  stats: ProviderMode;
  injuries: ProviderMode;
  odds: ProviderMode;
}

export interface Run {
  trace_id: string;
  traceId?: string;
  slipId?: string;
  snapshotId?: string;
  anonSessionId?: string;
  requestId?: string;
  createdAt: string;
  updatedAt: string;
  status: 'running' | 'complete' | 'failed';
  slipText: string;
  extractedLegs: ExtractedLeg[];
  enrichedLegs: EnrichedLeg[];
  analysis: VerdictAnalysis;
  report?: SlipStructureReport;
  sources: SourceStats;
  trustedContext?: TrustedContextBundle;
  metadata?: {
    originalSlipText?: string;
    crowdNotes?: string;
    inferredSport?: boolean;
  };
}
