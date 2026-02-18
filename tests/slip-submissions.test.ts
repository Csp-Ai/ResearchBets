import { describe, expect, it, beforeEach } from 'vitest';

import { MemoryRuntimeStore, resetRuntimeDb } from '../src/core/persistence/runtimeDb';

describe('slip submission persistence', () => {
  beforeEach(() => resetRuntimeDb());

  it('creates and updates slip submissions in memory store', async () => {
    const store = new MemoryRuntimeStore();
    await store.createSlipSubmission({
      id: '550e8400-e29b-41d4-a716-446655440000',
      anonSessionId: 'anon-1',
      userId: null,
      createdAt: new Date().toISOString(),
      source: 'paste',
      rawText: 'Lakers -4.5',
      parseStatus: 'received',
      extractedLegs: null,
      traceId: 'trace-1',
      requestId: 'req-1',
      checksum: 'abc',
    });

    await store.updateSlipSubmission('550e8400-e29b-41d4-a716-446655440000', { parseStatus: 'parsed', extractedLegs: [{ selection: 'Lakers -4.5' }] });

    const item = await store.getSlipSubmission('550e8400-e29b-41d4-a716-446655440000');
    expect(item?.parseStatus).toBe('parsed');
    expect(item?.extractedLegs?.length).toBe(1);

    const listed = await store.listSlipSubmissions({ anonSessionId: 'anon-1', limit: 10 });
    expect(listed.length).toBe(1);
  });
});
