import { beforeEach, describe, expect, it, vi } from 'vitest';

const maybeSingle = vi.fn();
const upsert = vi.fn();
const eq = vi.fn(() => ({ maybeSingle }));
const select = vi.fn(() => ({ eq }));
const from = vi.fn(() => ({ select, upsert }));

vi.mock('@/src/core/supabase/service', () => ({
  getSupabaseServiceClient: () => ({ from }),
}));

describe('today cache server module', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-20T12:00:00.000Z'));
    vi.clearAllMocks();
  });

  it('builds stable canonical cache keys', async () => {
    const { getTodayCacheKey } = await import('../cache.server');
    expect(getTodayCacheKey({ sport: 'NBA', tz: 'UTC', date: '2026-01-20' })).toBe('today:NBA:UTC:2026-01-20');
  });

  it('returns null for stale durable cache entries', async () => {
    maybeSingle.mockResolvedValue({
      data: {
        payload: { mode: 'live', generatedAt: '2026-01-20T11:30:00.000Z', leagues: [], games: [] },
        saved_at: '2026-01-20T11:30:00.000Z',
      },
      error: null,
    });

    const { readLastGoodToday } = await import('../cache.server');
    const result = await readLastGoodToday({ sport: 'NBA', tz: 'UTC', date: '2026-01-20' });

    expect(result).toBeNull();
  });

  it('writes cache records to durable storage', async () => {
    upsert.mockResolvedValue({ error: null });

    const { writeLastGoodToday } = await import('../cache.server');
    await writeLastGoodToday(
      { sport: 'NBA', tz: 'UTC', date: '2026-01-20' },
      { mode: 'live', generatedAt: '2026-01-20T12:00:00.000Z', leagues: [], games: [] },
    );

    expect(from).toHaveBeenCalledWith('today_cache');
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        cache_key: 'today:NBA:UTC:2026-01-20',
        sport: 'NBA',
        tz: 'UTC',
        date: '2026-01-20',
      }),
      { onConflict: 'cache_key' },
    );
  });
});
