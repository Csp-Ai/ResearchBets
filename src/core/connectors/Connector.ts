import type { TraceEmitter } from '../agent-runtime/trace';
import type { EvidenceItem, EvidenceSourceType } from '../evidence/evidenceSchema';

export type ResearchTier = 'free' | 'pro' | 'elite';
export type RuntimeEnvironment = 'dev' | 'staging' | 'prod';

export interface ConnectorFetchOptions {
  seed?: string;
  now?: string;
  idempotencyKey: string;
}

export interface ConnectorFetchResult {
  evidence: EvidenceItem[];
  raw: Record<string, unknown>;
}

export interface ConnectorExecutionContext {
  subject: string;
  traceId: string;
  runId: string;
  requestId: string;
  userId?: string | null;
  agentId: string;
  modelVersion: string;
  environment: RuntimeEnvironment;
  traceEmitter?: TraceEmitter;
}

export interface Connector {
  id: string;
  sourceType: EvidenceSourceType;
  sourceName: string;
  reliabilityDefault: number;
  requiredEnv: string[];
  allowedTiers: readonly ResearchTier[];
  allowedEnvironments: readonly RuntimeEnvironment[];
  healthCheck(): Promise<boolean>;
  fetch(context: ConnectorExecutionContext, options: ConnectorFetchOptions): Promise<ConnectorFetchResult>;
}
