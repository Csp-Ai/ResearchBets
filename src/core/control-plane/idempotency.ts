import { createHash } from 'node:crypto';

import { persistenceDb } from '../persistence/runtimeDb';

export interface IdempotencyRecord<T> {
  endpoint: string;
  userId: string;
  key: string;
  response: T;
  responseHash: string;
  createdAt: string;
}

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
}: {
  endpoint: string;
  userId: string;
  key: string;
  handler: () => Promise<T>;
}): Promise<{ replayed: boolean; response: T }> => {
  const storeKey = makeStoreKey(endpoint, userId, key);
  const existing = inMemoryStore.get(storeKey) as IdempotencyRecord<T> | undefined;

  if (existing) {
    return { replayed: true, response: existing.response };
  }

  const response = await handler();
  const responseHash = createHash('sha256').update(JSON.stringify(response)).digest('hex');

  const record: IdempotencyRecord<T> = {
    endpoint,
    userId,
    key,
    response,
    responseHash,
    createdAt: new Date().toISOString(),
  };

  inMemoryStore.set(storeKey, record as IdempotencyRecord<unknown>);
  persistenceDb.idempotencyKeys.push(record);

  return { replayed: false, response };
};

export const clearIdempotencyStore = (): void => {
  inMemoryStore.clear();
};
