import type { EvidenceItem, EvidenceSourceType } from '../evidence/evidenceSchema';

export type ResearchTier = 'free' | 'premium';
export type RuntimeEnvironment = 'dev' | 'staging' | 'prod';

export interface ConnectorFetchResult {
  evidence: EvidenceItem[];
  raw: Record<string, unknown>;
}

export interface Connector {
  id: string;
  sourceType: EvidenceSourceType;
  sourceName: string;
  reliabilityDefault: number;
  requiresEnv: string[];
  allowedTiers: readonly ResearchTier[];
  allowedEnvironments: readonly RuntimeEnvironment[];
  healthCheck(): Promise<boolean>;
  fetch(subject: string, options: { seed: string; now: string }): Promise<ConnectorFetchResult>;
}
