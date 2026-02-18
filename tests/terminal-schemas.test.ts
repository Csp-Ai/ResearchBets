import { describe, expect, it } from 'vitest';

import {
  BetSchema,
  DecisionCardV0Schema,
  InsightNodeSchema,
  MarketSnapshotSchema,
  TrackedBetSchema
} from '../src/core/contracts/terminalSchemas';

describe('terminal contract schemas', () => {
  it('accepts minimal decision card shape', () => {
    const result = DecisionCardV0Schema.safeParse({
      id: 'decision_1',
      summary: 'Home team has lineup edge',
      confidence: 0.63
    });

    expect(result.success).toBe(true);
  });

  it('rejects invalid market snapshot payload', () => {
    const result = MarketSnapshotSchema.safeParse({
      sport: 'NFL',
      loadedAt: '2026-01-01T00:00:00.000Z',
      source: 'DEMO',
      degraded: false,
      games: [{ gameId: 'g1' }]
    });

    expect(result.success).toBe(false);
  });

  it('accepts valid insight node', () => {
    const result = InsightNodeSchema.safeParse({
      insight_id: 'insight_1',
      trace_id: 'trace_1',
      run_id: 'run_1',
      game_id: 'game_1',
      agent_key: 'agent',
      track: 'baseline',
      insight_type: 'outcome_snapshot',
      claim: 'Final score 100-90 (home).',
      evidence: [{ source: 'demo' }],
      confidence: 0.7,
      timestamp: '2026-01-01T00:00:00.000Z',
      decay_half_life: 720,
      decay_half_life_minutes: 720
    });

    expect(result.success).toBe(true);
  });

  it('rejects invalid tracked bet and bet confidence values', () => {
    const tracked = TrackedBetSchema.safeParse({
      gameId: 'g1',
      propId: 'p1',
      player: 'Player A',
      market: 'points',
      line: 21.5,
      modelProbability: 1.2,
      delta: 0.1
    });
    const bet = BetSchema.safeParse({
      id: 'bet_1',
      userId: 'u1',
      sessionId: 's1',
      selection: 'home',
      odds: 1.91,
      stake: 25,
      status: 'pending',
      confidence: -0.1,
      createdAt: '2026-01-01T00:00:00.000Z'
    });

    expect(tracked.success).toBe(false);
    expect(bet.success).toBe(false);
  });
});
