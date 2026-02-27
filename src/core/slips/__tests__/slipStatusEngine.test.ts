import { describe, expect, it } from 'vitest';

import { computeSlipStatus } from '../slipStatusEngine';
import type { SlipTrackingState } from '../trackingTypes';

function baseState(): SlipTrackingState {
  return {
    slipId: 's1',
    createdAtIso: '2026-01-01T00:00:00.000Z',
    mode: 'demo',
    status: 'alive',
    legs: [
      { legId: 'a', gameId: 'g1', player: 'A', market: 'points', line: '20.5', volatility: 'low', outcome: 'pending', updatedAtIso: '2026-01-01T00:00:00.000Z' },
      { legId: 'b', gameId: 'g2', player: 'B', market: 'rebounds', line: '7.5', volatility: 'high', outcome: 'pending', updatedAtIso: '2026-01-01T00:00:00.000Z' }
    ]
  };
}

describe('computeSlipStatus', () => {
  it('marks eliminated when any leg misses', () => {
    const state = baseState();
    state.legs[1]!.outcome = 'miss';

    const next = computeSlipStatus(state);

    expect(next.status).toBe('eliminated');
    expect(next.eliminatedByLegId).toBe('b');
  });

  it('does not drop other legs after elimination', () => {
    const state = baseState();
    state.legs[0]!.outcome = 'pending';
    state.legs[1]!.outcome = 'miss';

    const next = computeSlipStatus(state);

    expect(next.legs).toHaveLength(2);
    expect(next.legs[0]!.outcome).toBe('pending');
  });

  it('marks settled when no legs are pending', () => {
    const state = baseState();
    state.legs[0]!.outcome = 'hit';
    state.legs[1]!.outcome = 'void';

    const next = computeSlipStatus(state);

    expect(next.status).toBe('settled');
  });
});
