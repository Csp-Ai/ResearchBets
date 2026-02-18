import { describe, expect, it, beforeEach } from 'vitest';

import { InMemoryEventEmitter } from '../src/core/control-plane/emitter';
import { computeLineCLV, computePriceCLV } from '../src/core/measurement/clv';
import { calculateRoiPercent } from '../src/core/measurement/oddsFormat';
import { logAgentRecommendation } from '../src/core/measurement/recommendations';
import { settleBet } from '../src/core/measurement/settlement';
import { MemoryRuntimeStore, resetRuntimeDb } from '../src/core/persistence/runtimeDb';

beforeEach(() => {
  resetRuntimeDb();
});

describe('clv', () => {
  it('computes line and price clv directionally', () => {
    expect(computeLineCLV({ marketType: 'spread', placedLine: -3.5, closingLine: -2.5 })).toBe(1);
    expect(computeLineCLV({ marketType: 'moneyline', placedLine: null, closingLine: null })).toBeNull();
    expect(computePriceCLV({ placedPrice: -110, closingPrice: -125 })).toBeGreaterThan(0);
    expect(computePriceCLV({ placedPrice: 1.91, closingPrice: 2.2, placedFormat: 'decimal', closingFormat: 'decimal' })).toBeLessThan(0);
  });
});

describe('recommendation logging and settlement', () => {
  it('logs recommendation and emits snake_case decision event', async () => {
    const store = new MemoryRuntimeStore();
    const emitter = new InMemoryEventEmitter();
    const id = await logAgentRecommendation(
      {
        sessionId: 's1',
        userId: 'u1',
        requestId: 'req1',
        traceId: 'tr1',
        runId: 'run1',
        agentId: 'agent_a',
        agentVersion: 'v1',
        gameId: 'game1',
        marketType: 'spread',
        market: 'spread',
        selection: 'home',
        line: -3.5,
        price: -110,
        confidence: 0.77,
        rationale: { why: 'model' },
        evidenceRefs: { ids: ['e1'] },
      },
      emitter,
      store,
    );

    expect((await store.getRecommendation(id))?.id).toBe(id);
    const event = emitter.getEvents().find((item) => item.event_name === 'agent_scored_decision');
    expect(event?.event_name).toBe('agent_scored_decision');
    expect(event?.properties).toHaveProperty('decision_id');
    expect(event?.properties).toHaveProperty('features');
  });

  it('settles bet and writes clv fields', async () => {
    const store = new MemoryRuntimeStore();
    const emitter = new InMemoryEventEmitter();
    await store.saveBet({
      id: 'bet1',
      userId: 'u1',
      sessionId: 's1',
      snapshotId: 'snap1',
      traceId: 'trace1',
      runId: 'run1',
      selection: 'home',
      gameId: 'game1',
      marketType: 'spread',
      line: -3.5,
      oddsFormat: 'american',
      price: -110,
      odds: 1.91,
      placedLine: -3.5,
      placedPrice: -110,
      placedOdds: 1.909091,
      followedAi: true,
      stake: 100,
      status: 'pending',
      outcome: null,
      settledProfit: null,
      confidence: 0.8,
      createdAt: new Date().toISOString(),
      settledAt: null,
    });

    await store.saveOddsSnapshot({
      id: 'od1',
      gameId: 'game1',
      market: 'spread',
      marketType: 'spread',
      selection: 'home',
      line: -2.5,
      price: -120,
      book: 'book',
      capturedAt: new Date().toISOString(),
      gameStartsAt: new Date(Date.now() + 10_000).toISOString(),
      sourceUrl: 'https://book.test/odds',
      sourceDomain: 'book.test',
      fetchedAt: new Date().toISOString(),
      publishedAt: null,
      parserVersion: 'test',
      checksum: 'abc',
      stalenessMs: 0,
      freshnessScore: 1,
      resolutionReason: 'closing',
      consensusLevel: 'two_source_agree',
      sourcesUsed: ['source.test', 'book.test'],
      disagreementScore: 0,
    });

    await store.saveGameResult({
      id: 'gr1',
      gameId: 'game1',
      payload: { home_score: 110, away_score: 100 },
      completedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      isFinal: true,
      sourceUrl: 'https://results.test/game1',
      sourceDomain: 'results.test',
      fetchedAt: new Date().toISOString(),
      publishedAt: null,
      parserVersion: 'test',
      checksum: 'xyz',
      stalenessMs: 0,
      freshnessScore: 1,
      consensusLevel: 'two_source_agree',
      sourcesUsed: ['results.test', 'backup.test'],
      disagreementScore: 0,
    });

    await settleBet(
      'bet1',
      { requestId: 'req', traceId: 'tr', runId: 'run', sessionId: 's1', userId: 'u1', agentId: 'settler', modelVersion: 'v1' },
      emitter,
      store,
    );

    const settled = await store.getBet('bet1');
    expect(settled?.status).toBe('settled');
    expect(settled?.clvLine).toBe(1);
    expect(settled?.clvPrice).not.toBeNull();
    expect(settled?.settledProfit).toBe(90.91);
    expect(calculateRoiPercent(settled?.settledProfit ?? 0, settled?.stake ?? 1)).toBe(90.91);
  });

  it('runs end-to-end measurement smoke pipeline', async () => {
    const store = new MemoryRuntimeStore();
    const emitter = new InMemoryEventEmitter();
    const recId = await logAgentRecommendation(
      {
        sessionId: 's1',
        userId: 'u1',
        requestId: 'req2',
        traceId: 'tr2',
        runId: 'run2',
        agentId: 'agent_a',
        agentVersion: 'v1',
        gameId: 'game2',
        marketType: 'spread',
        market: 'spread',
        selection: 'home',
        line: -4.5,
        price: -105,
        confidence: 0.75,
        rationale: { why: 'signal' },
        evidenceRefs: { ids: ['e2'] },
      },
      emitter,
      store,
    );

    await store.saveBet({
      id: 'bet2', userId: 'u1', sessionId: 's1', snapshotId: 'snap2', traceId: 'tr2', runId: 'run2', selection: 'home', gameId: 'game2', marketType: 'spread', line: -4.5, oddsFormat: 'american', price: -105, odds: 1.95, placedLine: -4.5, placedPrice: -105, placedOdds: 1.952381, recommendedId: recId, followedAi: true, stake: 100, status: 'pending', outcome: null, settledProfit: null, confidence: 0.75, createdAt: new Date().toISOString(), settledAt: null,
    });

    const now = new Date().toISOString();
    await store.saveOddsSnapshot({
      id: 'od2', gameId: 'game2', market: 'spread', marketType: 'spread', selection: 'home', line: -3.5, price: -115, book: 'book', capturedAt: now, gameStartsAt: new Date(Date.now() + 3600000).toISOString(), sourceUrl: 'https://book.test/odds2', sourceDomain: 'book.test', fetchedAt: now, publishedAt: null, parserVersion: 'test', checksum: 'abc2', stalenessMs: 0, freshnessScore: 1, resolutionReason: 'closing', consensusLevel: 'two_source_agree', sourcesUsed: ['book.test','agg.test'], disagreementScore: 0.01,
    });

    await store.saveGameResult({
      id: 'gr2', gameId: 'game2', payload: { home_score: 24, away_score: 17 }, completedAt: now, createdAt: now, isFinal: true, sourceUrl: 'https://results.test/game2', sourceDomain: 'results.test', fetchedAt: now, publishedAt: null, parserVersion: 'test', checksum: 'xyz2', stalenessMs: 0, freshnessScore: 1, consensusLevel: 'two_source_agree', sourcesUsed: ['results.test','official.test'], disagreementScore: 0,
    });

    await settleBet('bet2', { requestId: 'req2', traceId: 'tr2', runId: 'run2', sessionId: 's1', userId: 'u1', agentId: 'settler', modelVersion: 'v2' }, emitter, store);

    const settled = await store.getBet('bet2');
    expect(settled?.status).toBe('settled');
    expect(settled?.clvLine).toBeGreaterThan(0);

    const { generateEdgeReport } = await import('../src/core/measurement/edge');
    const report = await generateEdgeReport({ window: '30d', requestContext: { requestId: 'req2', traceId: 'tr2', runId: 'run2', sessionId: 's1', userId: 'u1', agentId: 'edge', modelVersion: 'v2' }, emitter }, store);
    expect(report).toHaveProperty('data_quality.results_confirmed_by_consensus_pct');
  });

});
