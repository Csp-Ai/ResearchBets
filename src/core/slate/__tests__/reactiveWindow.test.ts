import { describe, expect, it } from 'vitest';

import { detectReactiveWindow } from '../reactiveWindow';

describe('detectReactiveWindow', () => {
  it('marks reactive when game is live', () => {
    const result = detectReactiveWindow({
      mode: 'demo',
      generatedAt: '2026-01-15T19:30:00.000Z',
      leagues: ['NBA'],
      games: [
        {
          id: 'g1',
          league: 'NBA',
          status: 'live',
          startTime: 'Q3 07:12',
          matchup: 'A @ B',
          teams: ['A', 'B'],
          bookContext: 'demo',
          propsPreview: [],
          provenance: 'demo',
          lastUpdated: '2026-01-15T19:30:00.000Z'
        }
      ]
    });

    expect(result.isReactive).toBe(true);
    expect(result.reason).toBe('live_games');
  });

  it('marks reactive when first tip is within 20 minutes', () => {
    const result = detectReactiveWindow({
      mode: 'cache',
      generatedAt: '2026-01-15T19:30:00.000Z',
      leagues: ['NBA'],
      games: [
        {
          id: 'g1',
          league: 'NBA',
          status: 'upcoming',
          startTime: '7:45 PM ET',
          matchup: 'A @ B',
          teams: ['A', 'B'],
          bookContext: 'demo',
          propsPreview: [],
          provenance: 'demo',
          lastUpdated: '2026-01-15T19:30:00.000Z'
        }
      ]
    }, '2026-01-16T00:30:00.000Z');

    expect(result.isReactive).toBe(true);
    expect(result.reason).toBe('first_tip_soon');
  });
});
