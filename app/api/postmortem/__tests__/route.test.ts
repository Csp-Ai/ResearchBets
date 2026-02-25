import { describe, expect, it } from 'vitest';

import { POST } from '../route';

describe('/api/postmortem POST', () => {
  it('returns deterministic classification plus slip intelligence fields', async () => {
    const req = new Request('http://localhost:3000/api/postmortem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        outcome: 'loss',
        legs: [
          { selection: 'Luka Doncic over 31.5 points', player: 'Luka Doncic', game: 'LAL @ DAL', odds: '+160', line: '31.5', riskFlags: ['same game'] },
          { selection: 'Kyrie Irving over 3.5 threes', player: 'Kyrie Irving', game: 'LAL @ DAL', odds: '+120', line: '3.5' },
          { selection: 'LeBron James over 7.5 assists', player: 'LeBron James', game: 'LAL @ DAL', odds: '+125', line: '7.5' }
        ]
      })
    });

    const response = await POST(req);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(typeof payload.correlationScore).toBe('number');
    expect(payload.correlationScore).toBeGreaterThan(0);
    expect(payload.volatilityTier).toBeTypeOf('string');
    expect(payload.exposureSummary.topGames[0].game).toBe('LAL @ DAL');
  });
});
