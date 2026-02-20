import { afterEach, describe, expect, it, vi } from 'vitest';

import { POST } from '../app/api/cron/settle-bets/route';

vi.mock('@/src/core/bettor/settlePendingBets', () => ({
  settlePendingBets: vi.fn(async () => ({ scanned: 0, settled: 0, skipped: 0, failed: 0 }))
}));

describe('POST /api/cron/settle-bets auth', () => {
  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it('returns 401 when secret is missing or invalid', async () => {
    process.env.CRON_SECRET = 'expected';
    const res = await POST(new Request('http://localhost/api/cron/settle-bets', { method: 'POST', headers: { 'x-cron-secret': 'wrong' } }));

    expect(res.status).toBe(401);
  });

  it('returns summary when secret is valid', async () => {
    process.env.CRON_SECRET = 'expected';
    const res = await POST(new Request('http://localhost/api/cron/settle-bets', { method: 'POST', headers: { 'x-cron-secret': 'expected' } }));
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(payload).toEqual({ scanned: 0, settled: 0, skipped: 0, failed: 0 });
  });
});
