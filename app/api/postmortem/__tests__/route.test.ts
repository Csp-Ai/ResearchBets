import { describe, expect, it } from 'vitest';

import { POST } from '../route';

describe('/api/postmortem POST', () => {
  it('returns deterministic classification and attribution compatible with canonical report', async () => {
    const req = new Request('http://localhost:3000/api/postmortem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        outcome: 'loss',
        trace_id: 'trace-123',
        slip_id: 'slip-123',
        legs: [
          { selection: 'Luka Doncic over 31.5 points', player: 'Luka Doncic', game: 'LAL @ DAL', odds: '+160', line: '31.5', riskFlags: ['same game', 'line moved'] },
          { selection: 'Luka Doncic over 8.5 assists', player: 'Luka Doncic', game: 'LAL @ DAL', odds: '+120', line: '8.5' },
          { selection: 'LeBron James over 7.5 assists', player: 'LeBron James', game: 'LAL @ DAL', odds: '+125', line: '7.5' }
        ]
      })
    });

    const response = await POST(req);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.attribution.tags).toContain('correlation_miss');
    expect(payload.attribution.tags).toContain('line_value_miss');
    expect(payload.report.attribution.tags).toEqual(payload.attribution.tags);
    expect(payload.report.failure_forecast.top_reasons.length).toBeGreaterThan(0);
  });
});
