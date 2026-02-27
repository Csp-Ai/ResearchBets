import { describe, expect, it } from 'vitest';

import { normalizeTodayPayload } from '@/src/core/today/normalize';

describe('normalizeTodayPayload', () => {
  it('supports wrapped data shape', () => {
    const payload = normalizeTodayPayload({
      data: {
        mode: 'demo',
        games: [{ id: 'g1', matchup: 'A @ B', startTime: '7:00 PM' }],
        board: [{ id: 'p1', player: 'A', market: 'points', line: '21.5', odds: '-110', hitRateL10: 63, gameId: 'g1' }]
      }
    });

    expect(payload.mode).toBe('demo');
    expect(payload.games).toHaveLength(1);
    expect(payload.board).toHaveLength(1);
    expect(payload.board[0]?.riskTag).toBe('stable');
  });

  it('is idempotent for already normalized objects', () => {
    const once = normalizeTodayPayload({
      mode: 'cache',
      reason: 'live_ok',
      trace_id: 'trace-1',
      games: [{ id: 'g1', matchup: 'A @ B', startTime: '7:00 PM' }],
      board: [{ id: 'p1', player: 'A', market: 'assists', line: '6.5', odds: '-110', hitRateL10: 58, gameId: 'g1' }]
    });
    const twice = normalizeTodayPayload(once);

    expect(twice).toEqual(once);
  });

  it('maps legacy traceId into canonical trace_id', () => {
    const payload = normalizeTodayPayload({
      mode: 'live',
      traceId: 'legacy-trace',
      games: [],
      board: []
    });

    expect(payload.trace_id).toBe('legacy-trace');
    expect(payload.traceId).toBe('legacy-trace');
  });

  it('builds board from legacy propsPreview', () => {
    const payload = normalizeTodayPayload({
      mode: 'demo',
      games: [{ id: 'g1', matchup: 'A @ B', startTime: '7:00 PM', propsPreview: [{ id: 'p1', player: 'A', market: 'assists', line: '6.5', rationale: ['x'] }] }]
    });

    expect(payload.board.length).toBeGreaterThan(0);
    expect(payload.board[0]?.gameId).toBe('g1');
  });
});
