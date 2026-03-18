/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it } from 'vitest';

import { DraftSlipStore } from '@/src/core/slips/draftSlipStore';
import { createTrackingFromDraft } from '@/src/core/slips/storage';

const leg = {
  id: 'leg-1',
  player: 'Jayson Tatum',
  marketType: 'points',
  line: '29.5',
  odds: '-110',
  game: 'BOS @ NYK'
} as const;

describe('DraftSlipStore continuity', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    DraftSlipStore.clearSlip();
  });

  it('issues slip_id and trace_id on first meaningful draft action', () => {
    DraftSlipStore.addLeg({ ...leg });

    const state = DraftSlipStore.getState();
    expect(state.legs).toHaveLength(1);
    expect(state.slip_id).toMatch(/[0-9a-f-]{36}/i);
    expect(state.trace_id).toMatch(/[0-9a-f-]{36}/i);
  });

  it('reuses issued identity during normal draft navigation', () => {
    DraftSlipStore.addLeg({ ...leg });
    const first = DraftSlipStore.getState();

    DraftSlipStore.updateLeg({ ...leg, odds: '-105' });
    DraftSlipStore.addLeg({ ...leg, id: 'leg-2', player: 'Jaylen Brown' });

    const next = DraftSlipStore.getState();
    expect(next.slip_id).toBe(first.slip_id);
    expect(next.trace_id).toBe(first.trace_id);
  });

  it('hydrates legacy legs-only storage into a stable identity', () => {
    window.sessionStorage.setItem('rb:draft-slip:v1', JSON.stringify([{ ...leg }]));

    const state = DraftSlipStore.getState();
    expect(state.legs).toHaveLength(1);
    expect(state.slip_id).toBeTruthy();
    expect(state.trace_id).toBeTruthy();
  });

  it('passes continuity identity from draft into tracking state', () => {
    DraftSlipStore.addLeg({ ...leg });
    const state = DraftSlipStore.getState();
    const tracking = createTrackingFromDraft(state.legs, 'demo', {
      slip_id: state.slip_id,
      trace_id: state.trace_id
    });

    expect(tracking.slipId).toBe(state.slip_id);
    expect(tracking.trace_id).toBe(state.trace_id);
  });

  it('clears identity on intentional reset', () => {
    DraftSlipStore.addLeg({ ...leg });
    DraftSlipStore.clearSlip();

    const state = DraftSlipStore.getState();
    expect(state.legs).toEqual([]);
    expect(state.slip_id).toBeUndefined();
    expect(state.trace_id).toBeUndefined();
  });
});
