import { describe, expect, it } from 'vitest';

import { resolveTodayTruth } from '@/src/core/today/service.server';

describe('board canonical parity', () => {
  it('returns same canonical board ids for same spine seed', async () => {
    const spine = { sport: 'NBA' as const, date: '2026-01-15', tz: 'America/Phoenix', mode: 'demo' as const };
    const homePayload = await resolveTodayTruth(spine);
    const todayPayload = await resolveTodayTruth(spine);
    const homeIds = (homePayload.board ?? []).map((row) => row.id).sort();
    const todayIds = (todayPayload.board ?? []).map((row) => row.id).sort();
    expect(homeIds.length).toBe(todayIds.length);
    expect(homeIds).toEqual(todayIds);
  });
});
