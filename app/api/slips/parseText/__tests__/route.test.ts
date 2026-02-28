import { describe, expect, it } from 'vitest';

import { POST } from '@/app/api/slips/parseText/route';

describe('/api/slips/parseText', () => {
  it('normalizes parsed text into tracked ticket dto', async () => {
    const response = await POST(new Request('http://localhost:3000/api/slips/parseText', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Jalen Brunson over 26.5 points -115', sourceHint: 'paste' })
    }));

    expect(response.status).toBe(200);
    const payload = await response.json() as { ok: boolean; data: { ticketId: string; legs: Array<{ player: string; marketType: string; direction: string }>; rawSlipText: string; sourceHint: string } };
    expect(payload.ok).toBe(true);
    expect(payload.data.ticketId).toMatch(/^ticket_/);
    expect(payload.data.legs.length).toBeGreaterThan(0);
    expect(payload.data.legs[0]?.marketType).toBe('points');
    expect(payload.data.legs[0]?.direction).toBe('over');
    expect(payload.data.sourceHint).toBe('paste');
  });
});
