import type { ControlPlaneEvent } from '../control-plane/events';
import type { ResearchReport } from '../evidence/evidenceSchema';

import type { IdempotencyRecord, RuntimeStore, SessionRecord, StoredBet } from './runtimeStore';

export interface RuntimeDb {
  sessions: SessionRecord[];
  snapshots: ResearchReport[];
  bets: StoredBet[];
  events: ControlPlaneEvent[];
  idempotencyKeys: IdempotencyRecord<unknown>[];
}

export const persistenceDb: RuntimeDb = {
  sessions: [],
  snapshots: [],
  bets: [],
  events: [],
  idempotencyKeys: [],
};

export class MemoryRuntimeStore implements RuntimeStore {
  async getSession(sessionId: string): Promise<SessionRecord | null> {
    return persistenceDb.sessions.find((session) => session.sessionId === sessionId) ?? null;
  }

  async upsertSession(session: SessionRecord): Promise<void> {
    const existingIndex = persistenceDb.sessions.findIndex((item) => item.sessionId === session.sessionId);
    if (existingIndex >= 0) {
      persistenceDb.sessions[existingIndex] = session;
      return;
    }
    persistenceDb.sessions.push(session);
  }

  async saveSnapshot(report: ResearchReport): Promise<void> {
    const index = persistenceDb.snapshots.findIndex((item) => item.reportId === report.reportId);
    if (index >= 0) {
      persistenceDb.snapshots[index] = report;
      return;
    }
    persistenceDb.snapshots.unshift(report);
  }

  async getSnapshot(reportId: string): Promise<ResearchReport | null> {
    return persistenceDb.snapshots.find((item) => item.reportId === reportId) ?? null;
  }

  async listBets(status?: StoredBet['status']): Promise<StoredBet[]> {
    return status ? persistenceDb.bets.filter((bet) => bet.status === status) : [...persistenceDb.bets];
  }

  async saveBet(bet: StoredBet): Promise<void> {
    const existingIndex = persistenceDb.bets.findIndex((item) => item.id === bet.id);
    if (existingIndex >= 0) {
      persistenceDb.bets[existingIndex] = bet;
      return;
    }
    persistenceDb.bets.unshift(bet);
  }

  async getBet(betId: string): Promise<StoredBet | null> {
    return persistenceDb.bets.find((item) => item.id === betId) ?? null;
  }

  async saveEvent(event: ControlPlaneEvent): Promise<void> {
    persistenceDb.events.push(event);
  }

  async getIdempotencyRecord<T>(endpoint: string, userId: string, key: string): Promise<IdempotencyRecord<T> | null> {
    return (persistenceDb.idempotencyKeys.find((item) => item.endpoint === endpoint && item.userId === userId && item.key === key) as
      | IdempotencyRecord<T>
      | undefined) ?? null;
  }

  async saveIdempotencyRecord<T>(record: IdempotencyRecord<T>): Promise<void> {
    const existingIndex = persistenceDb.idempotencyKeys.findIndex(
      (item) => item.endpoint === record.endpoint && item.userId === record.userId && item.key === record.key,
    );
    if (existingIndex >= 0) {
      persistenceDb.idempotencyKeys[existingIndex] = record;
      return;
    }
    persistenceDb.idempotencyKeys.push(record as IdempotencyRecord<unknown>);
  }
}

export const resetRuntimeDb = (): void => {
  persistenceDb.sessions.length = 0;
  persistenceDb.snapshots.length = 0;
  persistenceDb.bets.length = 0;
  persistenceDb.events.length = 0;
  persistenceDb.idempotencyKeys.length = 0;
};
