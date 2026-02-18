import type { ControlPlaneEvent } from '../control-plane/events';
import type { ResearchReport } from '../evidence/evidenceSchema';

export interface SessionRecord {
  sessionId: string;
  userId: string;
  lastSeenAt: string;
}

export interface StoredBet {
  id: string;
  userId: string;
  sessionId: string;
  snapshotId: string;
  traceId: string;
  runId: string;
  selection: string;
  odds: number;
  stake: number;
  status: 'pending' | 'settled';
  outcome: 'won' | 'lost' | 'push' | null;
  settledProfit: number | null;
  confidence: number;
  createdAt: string;
  settledAt: string | null;
}

export interface IdempotencyRecord<T> {
  endpoint: string;
  userId: string;
  key: string;
  response: T;
  responseHash: string;
  createdAt: string;
}

export interface RuntimeStore {
  getSession(sessionId: string): Promise<SessionRecord | null>;
  upsertSession(session: SessionRecord): Promise<void>;
  saveSnapshot(report: ResearchReport): Promise<void>;
  getSnapshot(reportId: string): Promise<ResearchReport | null>;
  listBets(status?: StoredBet['status']): Promise<StoredBet[]>;
  saveBet(bet: StoredBet): Promise<void>;
  getBet(betId: string): Promise<StoredBet | null>;
  saveEvent(event: ControlPlaneEvent): Promise<void>;
  getIdempotencyRecord<T>(endpoint: string, userId: string, key: string): Promise<IdempotencyRecord<T> | null>;
  saveIdempotencyRecord<T>(record: IdempotencyRecord<T>): Promise<void>;
}
