import { describe, expect, it, beforeEach } from 'vitest';

import { InMemoryEventEmitter } from '../src/core/control-plane/emitter';
import { computeLineCLV, computePriceCLV } from '../src/core/measurement/clv';
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
      odds: 1.91,
      placedLine: -3.5,
      placedPrice: -110,
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
    });

    await store.saveGameResult({
      id: 'gr1',
      gameId: 'game1',
      payload: { home_score: 110, away_score: 100 },
      completedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
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
  });
});
