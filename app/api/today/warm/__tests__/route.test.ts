import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const resolveToday = vi.fn();

vi.mock('@/src/core/today/resolveToday.server', () => ({ resolveToday }));

describe('POST /api/today/warm', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-20T12:00:00.000Z'));
    resolveToday.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    delete process.env.CRON_SECRET;
  });

  it('returns 401 when CRON_SECRET does not match', async () => {
    process.env.CRON_SECRET = 'expected';
    const { POST } = await import('../route');
    const response = await POST(new Request('http://localhost:3000/api/today/warm', { method: 'POST', headers: { 'x-cron-secret': 'wrong' } }));

    expect(response.status).toBe(401);
    expect(resolveToday).not.toHaveBeenCalled();
  });

  it('warms today cache with force refresh when CRON_SECRET matches', async () => {
    process.env.CRON_SECRET = 'expected';
    resolveToday.mockResolvedValue({ mode: 'live', reason: 'live_ok' });

    const { POST } = await import('../route');
    const response = await POST(new Request('http://localhost:3000/api/today/warm?secret=expected', { method: 'POST' }));
    const body = await response.json() as { ok: boolean; warmed: Array<{ sport: string; tz: string; date: string; mode: string; reason?: string }>; errors: string[] };

    expect(response.status).toBe(200);
    expect(resolveToday).toHaveBeenCalledWith(expect.objectContaining({
      mode: 'live',
      forceRefresh: true,
      sport: 'NBA',
      tz: 'America/Phoenix',
      date: '2026-01-20',
    }));
    expect(body.ok).toBe(true);
    expect(body.warmed).toEqual([{ sport: 'NBA', tz: 'America/Phoenix', date: '2026-01-20', mode: 'live', reason: 'live_ok' }]);
    expect(body.errors).toEqual([]);
  });
});
