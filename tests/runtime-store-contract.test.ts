import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

import { MemoryRuntimeStore } from '../src/core/persistence/runtimeDb';
import type { RuntimeStore } from '../src/core/persistence/runtimeStore';
import { SupabaseRuntimeStore } from '../src/core/persistence/supabaseRuntimeStore';

class QueryMock {
  constructor(private readonly result: { data: unknown; error: null } = { data: [], error: null }) {}
  select(): this { return this; }
  eq(): this { return this; }
  order(): this { return this; }
  limit(): this { return this; }
  update(): this { return this; }
  upsert(): Promise<{ data: unknown; error: null }> { return Promise.resolve(this.result); }
  insert(): Promise<{ data: unknown; error: null }> { return Promise.resolve(this.result); }
  maybeSingle(): Promise<{ data: unknown; error: null }> { return Promise.resolve({ data: null, error: null }); }
  then(resolve: (value: { data: unknown; error: null }) => unknown): unknown { return resolve(this.result); }
}

const createMockClient = (): SupabaseClient => ({
  from: () => new QueryMock() as unknown,
} as unknown as SupabaseClient);

const assertStoreContract = async (store: RuntimeStore): Promise<void> => {
  expect(typeof store.getSession).toBe('function');
  expect(typeof store.upsertSession).toBe('function');
  expect(typeof store.saveSnapshot).toBe('function');
  expect(typeof store.getSnapshot).toBe('function');
  expect(typeof store.listBets).toBe('function');
  expect(typeof store.saveBet).toBe('function');
  expect(typeof store.getBet).toBe('function');
  expect(typeof store.saveEvent).toBe('function');
  expect(typeof store.getIdempotencyRecord).toBe('function');
  expect(typeof store.saveIdempotencyRecord).toBe('function');
  expect(typeof store.saveRecommendation).toBe('function');
  expect(typeof store.listRecommendationsByGame).toBe('function');
  expect(typeof store.getRecommendation).toBe('function');
  expect(typeof store.saveOddsSnapshot).toBe('function');
  expect(typeof store.listOddsSnapshots).toBe('function');
  expect(typeof store.saveGameResult).toBe('function');
  expect(typeof store.getGameResult).toBe('function');
  expect(typeof store.saveWebCache).toBe('function');
  expect(typeof store.getLatestWebCacheByUrl).toBe('function');
  expect(typeof store.saveRecommendationOutcome).toBe('function');
  expect(typeof store.getRecommendationOutcome).toBe('function');
  expect(typeof store.saveExperiment).toBe('function');
  expect(typeof store.getExperiment).toBe('function');
  expect(typeof store.saveExperimentAssignment).toBe('function');
  expect(typeof store.getExperimentAssignment).toBe('function');
  expect(typeof store.createSlipSubmission).toBe('function');
  expect(typeof store.getSlipSubmission).toBe('function');
  expect(typeof store.listSlipSubmissions).toBe('function');
  expect(typeof store.updateSlipSubmission).toBe('function');
  expect(typeof store.listEvents).toBe('function');

  expect(await store.listBets()).toBeDefined();
  expect(await store.listRecommendationsByGame('g1')).toBeDefined();
  expect(await store.listOddsSnapshots('g1', 'spread', 'home')).toBeDefined();
  expect(await store.listSlipSubmissions({ limit: 1 })).toBeDefined();
};

describe('runtime store contract', () => {
  it('memory runtime store satisfies contract', async () => {
    const store: RuntimeStore = new MemoryRuntimeStore();
    await assertStoreContract(store);
  });

  it('supabase runtime store satisfies contract via mocked client', async () => {
    const store: RuntimeStore = new SupabaseRuntimeStore(createMockClient());
    await assertStoreContract(store);
  });

  it('supabase runtime store compile-time conformance', () => {
    const store: RuntimeStore = new SupabaseRuntimeStore(createMockClient());
    expect(store).toBeDefined();
  });
});
