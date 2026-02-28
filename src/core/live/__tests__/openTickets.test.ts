import { describe, expect, it } from 'vitest';

import { evaluateLiveLeg } from '@/src/core/live/openTickets';

describe('openTickets weakest leg reasons', () => {
  it('returns deterministic reason chips for fixed inputs', () => {
    const leg = evaluateLiveLeg({
      legId: 'leg-1',
      gameId: 'LAL@DAL',
      player: 'Player A',
      marketType: 'assists',
      threshold: 9.5,
      currentValue: 2,
      pregameSpread: 9,
      liveMargin: 19,
      recentMedian: 3,
      liveClock: { quarter: 3, timeRemainingSec: 420, elapsedGameMinutes: 30 }
    });

    expect(leg.reasonChips).toEqual(['Behind pace', 'High-variance market']);
  });
});
