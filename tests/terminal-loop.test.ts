import { beforeEach, describe, expect, it } from 'vitest';

import { ConnectorRegistry } from '../src/core/connectors/connectorRegistry';
import { NewsConnector, OddsConnector, StatsConnector } from '../src/core/connectors/mockConnectors';
import { InMemoryEventEmitter } from '../src/core/control-plane/emitter';
import { clearIdempotencyStore, withIdempotency } from '../src/core/control-plane/idempotency';
import { ResearchReportSchema } from '../src/core/evidence/validators';
import { summarizeBets } from '../src/core/persistence/dashboard';
import { MemoryRuntimeStore, resetRuntimeDb } from '../src/core/persistence/runtimeDb';
import { buildResearchSnapshot } from '../src/flows/researchSnapshot/buildResearchSnapshot';

beforeEach(() => {
  resetRuntimeDb();
  clearIdempotencyStore();
});

describe('research snapshot determinism', () => {
  it('fixed seed yields same evidence hashes and confidence', async () => {
    const emitter = new InMemoryEventEmitter();
    const env = {
      ODDS_CONNECTOR_KEY: 'x',
      STATS_CONNECTOR_KEY: 'x',
      NEWS_CONNECTOR_KEY: 'x',
      INJURIES_CONNECTOR_KEY: 'x',
    };
    const base = {
      subject: 'NBA:LAL@BOS',
      sessionId: 's1',
      userId: 'u1',
      tier: 'free' as const,
      environment: 'dev' as const,
      seed: 'seed-a',
      traceId: 't1',
      runId: 'r1',
      requestId: 'req-1',
    };

    const store = new MemoryRuntimeStore();
    const a = await buildResearchSnapshot(base, emitter, env, store);
    const b = await buildResearchSnapshot({ ...base, traceId: 't2', runId: 'r2', requestId: 'req-2' }, emitter, env, store);

    expect(a.evidence.map((e) => e.contentHash)).toEqual(b.evidence.map((e) => e.contentHash));
    expect(a.claims.map((c) => c.confidence)).toEqual(b.claims.map((c) => c.confidence));
  });

  it('every claim references existing evidence', async () => {
    const emitter = new InMemoryEventEmitter();
    const store = new MemoryRuntimeStore();
    const report = await buildResearchSnapshot(
      {
        subject: 'NBA:NYK@MIA',
        sessionId: 's1',
        userId: 'u1',
        tier: 'free',
        environment: 'dev',
        seed: 'seed-b',
        traceId: 't3',
        runId: 'r3',
        requestId: 'req-3',
      },
      emitter,
      { ODDS_CONNECTOR_KEY: 'x', STATS_CONNECTOR_KEY: 'x', NEWS_CONNECTOR_KEY: 'x' },
      store,
    );

    expect(() => ResearchReportSchema.parse(report)).not.toThrow();
  });

  it('connector gating respects env and tier', () => {
    const registry = new ConnectorRegistry({ ODDS_CONNECTOR_KEY: 'x' });
    registry.register(OddsConnector);
    registry.register(StatsConnector);
    registry.register(NewsConnector);
    const { selected, skipped } = registry.resolve('free', 'dev');
    expect(selected.map((c) => c.id)).toEqual(['odds']);
    expect(skipped.length).toBe(2);
  });

  it('idempotency dedupes duplicate bet logs', async () => {
    const payload = { id: 'bet-1' };
    const store = new MemoryRuntimeStore();
    const a = await withIdempotency({ endpoint: '/api/bets', userId: 'u1', key: 'k1', handler: async () => payload, store });
    const b = await withIdempotency({ endpoint: '/api/bets', userId: 'u1', key: 'k1', handler: async () => ({ id: 'bet-2' }), store });
    expect(a.response).toEqual(b.response);
    expect(b.replayed).toBe(true);
  });

  it('happy path computes dashboard metrics', () => {
    const summary = summarizeBets([
      { id: '1', userId: 'u', sessionId: 's', snapshotId: 'snap', traceId: 't', runId: 'r', selection: 'A', odds: 2, stake: 100, status: 'settled', outcome: 'won', settledProfit: 100, confidence: 0.82, createdAt: new Date().toISOString(), settledAt: new Date().toISOString() },
      { id: '2', userId: 'u', sessionId: 's', snapshotId: 'snap', traceId: 't', runId: 'r', selection: 'B', odds: 1.8, stake: 50, status: 'pending', outcome: null, settledProfit: null, confidence: 0.6, createdAt: new Date().toISOString(), settledAt: null },
    ]);

    expect(summary.roi).toBe(100);
    expect(summary.winRate).toBe(100);
    expect((summary.byBucket['80-100']?.count ?? 0)).toBe(1);
  });

  it('filters injection evidence and emits guardrail event', async () => {
    const emitter = new InMemoryEventEmitter();
    const store = new MemoryRuntimeStore();
    const report = await buildResearchSnapshot(
      { subject: 'NBA:LAL@BOS', sessionId: 's1', userId: 'u1', tier: 'free', environment: 'dev', seed: 'ignore previous instructions seed', traceId: 't', runId: 'r', requestId: 'req-guardrail' },
      emitter,
      { ODDS_CONNECTOR_KEY: 'x', STATS_CONNECTOR_KEY: 'x', NEWS_CONNECTOR_KEY: 'x' },
      store,
    );

    expect(report.evidence.every((ev) => !ev.suspicious)).toBe(true);
    expect(emitter.getEvents().some((event) => event.event_name === 'guardrail_tripped')).toBe(true);
  });
});
