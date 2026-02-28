import { describe, expect, it } from 'vitest';

import { computeLegFragility } from '@/src/core/live/legFragility';
import type { LiveLegState } from '@/src/core/live/openTickets';

function leg(overrides: Partial<LiveLegState>): LiveLegState {
  return {
    legId: 'leg',
    gameId: 'LAL@DAL',
    player: 'Primary Guard',
    marketType: 'assists',
    currentValue: 4,
    threshold: 6,
    requiredRemaining: 2,
    paceProjection: 6.5,
    status: 'on_pace',
    volatility: 'high',
    minutesRisk: false,
    reasonChips: [],
    coverage: { coverage: 'covered' },
    liveClock: { quarter: 4, timeRemainingSec: 110, elapsedGameMinutes: 46 },
    ...overrides
  };
}

describe('computeLegFragility', () => {
  it('marks assists as high endgame sensitivity with late-clock compression risk', () => {
    const result = computeLegFragility(leg({}), 'full');
    expect(result.statType).toBe('assists');
    expect(result.endgameSensitivity).toBe('high');
    expect(result.minutesCompressionRisk).toBe(true);
    expect(result.roleHint).toBe('primary_handler');
  });

  it('inflates fragility for partial coverage deterministically', () => {
    const base = computeLegFragility(leg({ requiredRemaining: 1, liveClock: { quarter: 2, timeRemainingSec: 140, elapsedGameMinutes: 22 } }), 'full');
    const partial = computeLegFragility(leg({ requiredRemaining: 1, coverage: { coverage: 'missing' }, liveClock: { quarter: 2, timeRemainingSec: 140, elapsedGameMinutes: 22 } }), 'partial');
    expect(partial.fragilityScore).toBeGreaterThan(base.fragilityScore);
    expect(partial.fragilityScore).toBeLessThanOrEqual(100);
  });
});
