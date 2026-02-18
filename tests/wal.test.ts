import { describe, expect, it, beforeEach, vi } from 'vitest';

import { InMemoryEventEmitter } from '../src/core/control-plane/emitter';
import { acquireWebData } from '../src/core/web/index';
import { MemoryRuntimeStore, resetRuntimeDb } from '../src/core/persistence/runtimeDb';
import { captureOddsSnapshot, resolveClosingOdds } from '../src/core/measurement/odds';
import { ingestGameResult } from '../src/core/measurement/results';
import { settleBet } from '../src/core/measurement/settlement';
import { generateEdgeReport } from '../src/core/measurement/edge';

beforeEach(() => {
  resetRuntimeDb();
  vi.restoreAllMocks();
  process.env.WAL_ALLOWLIST = 'source.test';
  process.env.WAL_BLOCKLIST = '';
  process.env.WAL_RATE_LIMITS_JSON = '{"source.test":1}';
});

describe('wal', () => {
  it('retries and caches by url', async () => {
    const store = new MemoryRuntimeStore();
    const emitter = new InMemoryEventEmitter();
    let calls = 0;
    vi.stubGlobal('fetch', vi.fn(async () => {
      calls += 1;
      if (calls === 1) throw new Error('transient');
      return new Response(JSON.stringify({ game_id: 'g1', market: 'spread', selection: 'home', line: -2.5, price: -110, is_final: true }), {
        status: 200,
        headers: { etag: 'abc' },
      });
    }));

    const first = await acquireWebData({
      request: { url: 'https://source.test/odds', dataType: 'odds', parserHint: 'json', maxStalenessMs: 60_000 },
      requestContext: { requestId: 'r1', traceId: 't1', runId: 'run1', sessionId: 's1', userId: 'u1', agentId: 'a1', modelVersion: 'v1' },
      emitter,
      store,
    });
    expect(first.records[0]?.sourceDomain).toBe('source.test');
    expect(await store.getLatestWebCacheByUrl('https://source.test/odds')).not.toBeNull();
  });

  it('blocks settlement when results are provisional', async () => {
    const store = new MemoryRuntimeStore();
    const emitter = new InMemoryEventEmitter();
    await store.saveBet({
      id: 'b1', userId: 'u1', sessionId: 's1', snapshotId: 'ss', traceId: 't1', runId: 'r1', selection: 'home', gameId: 'g1', marketType: 'spread',
      line: -3.5, odds: 1.91, stake: 100, status: 'pending', outcome: null, settledProfit: null, confidence: 0.7, createdAt: new Date().toISOString(), settledAt: null,
    });
    await captureOddsSnapshot({ requestId: 'r1', traceId: 't1', runId: 'r1', sessionId: 's1', userId: 'u1', agentId: 'a1', modelVersion: 'v1', gameId: 'g1', market: 'spread', marketType: 'spread', selection: 'home', line: -2.5, price: -120, book: 'book', sourceUrl: 'https://source.test/odds', sourceDomain: 'source.test', fetchedAt: new Date().toISOString(), parserVersion: 'v1', checksum: '123', stalenessMs: 0, freshnessScore: 1, consensusLevel: 'two_source_agree', sourcesUsed: ['source.test','backup.test'], disagreementScore: 0 }, emitter, store);
    await ingestGameResult('g1', { home_score: 10, away_score: 7, is_final: false }, { requestId: 'r1', traceId: 't1', runId: 'r1', sessionId: 's1', userId: 'u1', agentId: 'a1', modelVersion: 'v1' }, emitter, store);

    await expect(settleBet('b1', { requestId: 'r1', traceId: 't1', runId: 'r1', sessionId: 's1', userId: 'u1', agentId: 'a1', modelVersion: 'v1' }, emitter, store)).rejects.toThrow(/not final/);
  });

  it('closing resolver emits fallback reason and edge report includes data quality', async () => {
    const store = new MemoryRuntimeStore();
    const emitter = new InMemoryEventEmitter();
    const now = new Date().toISOString();
    await captureOddsSnapshot({ requestId: 'r1', traceId: 't1', runId: 'run1', sessionId: 's1', userId: 'u1', agentId: 'a1', modelVersion: 'v1', gameId: 'g1', market: 'spread', marketType: 'spread', selection: 'home', line: -3.5, price: -110, book: 'b1', capturedAt: now, sourceUrl: 'https://source.test/odds', sourceDomain: 'source.test', fetchedAt: now, parserVersion: 'v1', checksum: 'x', stalenessMs: 9999999, freshnessScore: 0.1, consensusLevel: 'conflict', sourcesUsed: ['source.test','source2.test'], disagreementScore: 0.9 }, emitter, store);
    const closing = await resolveClosingOdds({ gameId: 'g1', market: 'spread', selection: 'home', requestContext: { requestId: 'r1', traceId: 't1', runId: 'run1', sessionId: 's1', userId: 'u1', agentId: 'a1', modelVersion: 'v1' }, emitter, store });
    expect(closing?.resolutionReason).toBe('stale_fallback');

    await store.saveBet({ id: 'b1', userId: 'u1', sessionId: 's1', snapshotId: 'x', traceId: 't1', runId: 'run1', selection: 'home', gameId: 'g1', marketType: 'spread', line: -3.5, odds: -110, stake: 100, status: 'settled', outcome: 'won', settledProfit: 90, confidence: 0.8, createdAt: now, settledAt: now, closingLine: -3.5, closingPrice: -110, clvLine: 0.2, clvPrice: 1.1, sourceDomain: 'source.test', resolutionReason: 'stale_fallback' });
    const report = await generateEdgeReport({ window: '30d', requestContext: { requestId: 'r1', traceId: 't1', runId: 'run1', sessionId: 's1', userId: 'u1', agentId: 'a1', modelVersion: 'v1' }, emitter }, store);
    expect(report).toHaveProperty('data_quality');
    expect(report).toHaveProperty('cohort_sizes');
  });
});
