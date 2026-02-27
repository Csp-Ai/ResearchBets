import { describe, expect, it } from 'vitest';

import { resolveTodayTruth, MIN_BOARD_ROWS } from '@/src/core/today/service.server';

describe('today truth resolver', () => {
  it('returns non-empty deterministic board in demo mode', async () => {
    const payload = await resolveTodayTruth({ mode: 'demo', sport: 'NBA', date: '2026-01-15', tz: 'America/Phoenix' });
    expect(payload.mode).toBe('demo');
    expect((payload.board ?? []).length).toBeGreaterThanOrEqual(MIN_BOARD_ROWS);
  });

  it('falls back to cache/demo when live request yields no usable slate', async () => {
    const payload = await resolveTodayTruth({ forceRefresh: true, sport: 'NBA', date: '1999-01-01', tz: 'America/Phoenix', mode: 'live' });
    expect((payload.board ?? []).length).toBeGreaterThanOrEqual(MIN_BOARD_ROWS);
    expect(['cache', 'demo']).toContain(payload.mode);
  });

  it('does not return empty board for market closed path', async () => {
    const payload = await resolveTodayTruth({ mode: 'demo', sport: 'NBA', date: '2026-01-15', tz: 'America/Phoenix' });
    expect(payload.status).toBeDefined();
    expect((payload.board ?? []).length).toBeGreaterThanOrEqual(MIN_BOARD_ROWS);
  });
});
