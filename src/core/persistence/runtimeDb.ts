import type { ControlPlaneEvent } from '../control-plane/events';
import type { ResearchReport } from '../evidence/evidenceSchema';

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

export interface RuntimeDb {
  sessions: Array<{ sessionId: string; userId: string; lastSeenAt: string }>;
  snapshots: ResearchReport[];
  bets: StoredBet[];
  events: ControlPlaneEvent[];
  idempotencyKeys: unknown[];
}

export const persistenceDb: RuntimeDb = {
  sessions: [],
  snapshots: [],
  bets: [],
  events: [],
  idempotencyKeys: [],
};

export const resetRuntimeDb = (): void => {
  persistenceDb.sessions.length = 0;
  persistenceDb.snapshots.length = 0;
  persistenceDb.bets.length = 0;
  persistenceDb.events.length = 0;
  persistenceDb.idempotencyKeys.length = 0;
};
