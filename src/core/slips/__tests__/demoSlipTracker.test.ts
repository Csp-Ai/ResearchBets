import { describe, expect, it } from 'vitest';

import { advanceDemoTracking } from '../demoSlipTracker';
import type { SlipTrackingState } from '../trackingTypes';

const initial: SlipTrackingState = {
  slipId: 'demo-slip-1',
  createdAtIso: '2026-01-01T00:00:00.000Z',
  mode: 'demo',
  status: 'alive',
  legs: [
    { legId: 'leg-1', gameId: 'g1', player: 'P1', market: 'points', line: '20.5', volatility: 'high', convictionAtBuild: 60, outcome: 'pending', updatedAtIso: '2026-01-01T00:00:00.000Z' },
    { legId: 'leg-2', gameId: 'g2', player: 'P2', market: 'assists', line: '5.5', volatility: 'low', convictionAtBuild: 80, outcome: 'pending', updatedAtIso: '2026-01-01T00:00:00.000Z' }
  ]
};

describe('advanceDemoTracking', () => {
  it('is deterministic for same input timestamp', () => {
    const first = advanceDemoTracking(initial, '2026-01-01T00:04:00.000Z');
    const second = advanceDemoTracking(initial, '2026-01-01T00:04:00.000Z');
    expect(first).toEqual(second);
  });

  it('can eliminate slip mid-run', () => {
    const advanced = advanceDemoTracking(initial, '2026-01-01T00:20:00.000Z');
    expect(['eliminated', 'settled']).toContain(advanced.status);
    expect(advanced.legs.some((leg) => leg.outcome === 'miss')).toBe(true);
  });

  it('updates progress values over time', () => {
    const early = advanceDemoTracking(initial, '2026-01-01T00:01:00.000Z');
    const later = advanceDemoTracking(initial, '2026-01-01T00:06:00.000Z');
    expect((later.legs[0]!.currentValue ?? 0)).toBeGreaterThanOrEqual(early.legs[0]!.currentValue ?? 0);
  });
});
