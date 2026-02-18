import { randomUUID } from 'node:crypto';

import { persistenceDb } from '../persistence/runtimeDb';

export interface SessionRecord {
  sessionId: string;
  userId: string;
  lastSeenAt: string;
}

export const ensureSession = (existingSessionId?: string | null): SessionRecord => {
  const now = new Date().toISOString();

  if (existingSessionId) {
    const existing = persistenceDb.sessions.find((session) => session.sessionId === existingSessionId);
    if (existing) {
      existing.lastSeenAt = now;
      return existing;
    }
  }

  const created: SessionRecord = {
    sessionId: randomUUID(),
    userId: randomUUID(),
    lastSeenAt: now,
  };

  persistenceDb.sessions.push(created);
  return created;
};
