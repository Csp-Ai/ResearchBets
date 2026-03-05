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


  it('preserves optional minutes and source fields', () => {
    const payload = normalizeTodayPayload({
      mode: 'live',
      games: [{ id: 'g1', matchup: 'A @ B', startTime: '7:00 PM' }],
      board: [{ id: 'p1', player: 'A', market: 'pra', line: '31.5', odds: '-110', hitRateL10: 63, gameId: 'g1', minutesL1: 34, minutesL3Avg: 33.2, l5Avg: 29.7, l10Avg: 31.2, threesAttL1: 7, threesAttL3Avg: 6.3, threesAttL5Avg: 6.6, fgaL1: 18, fgaL3Avg: 17.1, fgaL5Avg: 16.8, l5Source: 'live', minutesSource: 'cached', attemptsSource: 'heuristic' }]
    });

    expect(payload.board[0]?.minutesL1).toBe(34);
    expect(payload.board[0]?.minutesL3Avg).toBe(33.2);
    expect(payload.board[0]?.l5Avg).toBe(29.7);
    expect(payload.board[0]?.l10Avg).toBe(31.2);
    expect(payload.board[0]?.threesAttL1).toBe(7);
    expect(payload.board[0]?.threesAttL3Avg).toBe(6.3);
    expect(payload.board[0]?.threesAttL5Avg).toBe(6.6);
    expect(payload.board[0]?.fgaL1).toBe(18);
    expect(payload.board[0]?.fgaL3Avg).toBe(17.1);
    expect(payload.board[0]?.fgaL5Avg).toBe(16.8);
    expect(payload.board[0]?.l5Source).toBe('live');
    expect(payload.board[0]?.minutesSource).toBe('cached');
    expect(payload.board[0]?.attemptsSource).toBe('heuristic');
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
