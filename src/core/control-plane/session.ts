import { randomUUID } from 'node:crypto';

import type { RuntimeStore, SessionRecord } from '../persistence/runtimeStore';
import { getRuntimeStore } from '../persistence/runtimeStoreProvider';

export const ensureSession = async (existingSessionId?: string | null, store: RuntimeStore = getRuntimeStore()): Promise<SessionRecord> => {
  const now = new Date().toISOString();

  if (existingSessionId) {
    const existing = await store.getSession(existingSessionId);
    if (existing) {
      const updated = { ...existing, lastSeenAt: now };
      await store.upsertSession(updated);
      return updated;
    }
  }

  const created: SessionRecord = {
    sessionId: randomUUID(),
    userId: randomUUID(),
    lastSeenAt: now,
  };

  await store.upsertSession(created);
  return created;
};
