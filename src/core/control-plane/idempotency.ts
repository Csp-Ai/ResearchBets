import { createHash } from 'node:crypto';

import type { RuntimeStore } from '../persistence/runtimeStore';
import { getRuntimeStore } from '../persistence/runtimeStoreProvider';

import type { IdempotencyRecord } from '../persistence/runtimeStore';

const inMemoryStore = new Map<string, IdempotencyRecord<unknown>>();

const makeStoreKey = (endpoint: string, userId: string, key: string): string => `${endpoint}:${userId}:${key}`;

export const requireIdempotencyKey = (value: string | null): string => {
  if (!value || value.trim().length === 0) {
    throw new Error('Missing idempotency key.');
  }

  return value.trim();
};

export const withIdempotency = async <T>({
  endpoint,
  userId,
  key,
  handler,
  store = getRuntimeStore(),
}: {
  endpoint: string;
  userId: string;
  key: string;
  handler: () => Promise<T>;
  store?: RuntimeStore;
}): Promise<{ replayed: boolean; response: T }> => {
  const storeKey = makeStoreKey(endpoint, userId, key);
  const cached = inMemoryStore.get(storeKey) as IdempotencyRecord<T> | undefined;
  if (cached) {
    return { replayed: true, response: cached.response };
  }

  const existing = await store.getIdempotencyRecord<T>(endpoint, userId, key);
  if (existing) {
    inMemoryStore.set(storeKey, existing as IdempotencyRecord<unknown>);
    return { replayed: true, response: existing.response };
  }

  const response = await handler();
  const record: IdempotencyRecord<T> = {
    endpoint,
    userId,
    key,
    response,
    responseHash: createHash('sha256').update(JSON.stringify(response)).digest('hex'),
    createdAt: new Date().toISOString(),
  };

  await store.saveIdempotencyRecord(record);
  inMemoryStore.set(storeKey, record as IdempotencyRecord<unknown>);

  return { replayed: false, response };
};

export const clearIdempotencyStore = (): void => {
  inMemoryStore.clear();
};
