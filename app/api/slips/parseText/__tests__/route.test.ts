import { describe, expect, it } from 'vitest';

import { POST } from '@/app/api/slips/parseText/route';

describe('/api/slips/parseText', () => {
  it('parses ladder and decimal props with confidence', async () => {
    const response = await POST(new Request('http://localhost:3000/api/slips/parseText', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Spencer Dinwiddie TO SCORE 25+ POINTS\nOVER 5.5 ASSISTS', sourceHint: 'paste' })
    }));

    expect(response.status).toBe(200);
    const payload = await response.json() as { ok: boolean; data: { legs: Array<{ marketType: string; threshold: number; direction: string; parseConfidence: string; ladder?: boolean }> } };
    expect(payload.ok).toBe(true);
    expect(payload.data.legs[0]?.marketType).toBe('points');
    expect(payload.data.legs[0]?.threshold).toBe(25);
    expect(payload.data.legs[0]?.direction).toBe('over');
    expect(payload.data.legs[0]?.ladder).toBe(true);
    expect(payload.data.legs[1]?.threshold).toBe(5.5);
    expect(payload.data.legs[1]?.parseConfidence).toMatch(/high|medium/);
  });

  it('keeps unparsed legs for review', async () => {
    const response = await POST(new Request('http://localhost:3000/api/slips/parseText', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: '???? weird line', sourceHint: 'paste' })
    }));

    const payload = await response.json() as { ok: boolean; data: { legs: Array<{ rawText?: string; parseConfidence: string }> } };
    expect(payload.ok).toBe(true);
    expect(payload.data.legs[0]?.rawText).toContain('weird line');
    expect(payload.data.legs[0]?.parseConfidence).toBe('low');
  });
});
