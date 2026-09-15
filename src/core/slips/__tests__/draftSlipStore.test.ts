/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DRAFT_SLIP_STORAGE_KEY,
  DRAFT_SLIP_UPDATED_EVENT,
  DraftSlipStore
} from '@/src/core/slips/draftSlipStore';
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
    vi.restoreAllMocks();
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

  it('migrates legacy legs-only storage once into a stable identity without dispatching a mutation event', () => {
    window.sessionStorage.setItem(DRAFT_SLIP_STORAGE_KEY, JSON.stringify([{ ...leg }]));
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const dispatch = vi.spyOn(window, 'dispatchEvent');

    const state = DraftSlipStore.migrateStorage();
    expect(state.legs).toHaveLength(1);
    expect(state.slip_id).toBeTruthy();
    expect(state.trace_id).toBeTruthy();
    expect(setItem).toHaveBeenCalledTimes(1);
    expect(dispatch).not.toHaveBeenCalled();

    const repeated = DraftSlipStore.getState();
    expect(repeated.slip_id).toBe(state.slip_id);
    expect(repeated.trace_id).toBe(state.trace_id);
    expect(setItem).toHaveBeenCalledTimes(1);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('keeps repeated reads side-effect free after a mutation', () => {
    let events = 0;
    const onUpdate = () => {
      events += 1;
    };
    window.addEventListener(DRAFT_SLIP_UPDATED_EVENT, onUpdate);
    const setItem = vi.spyOn(Storage.prototype, 'setItem');

    DraftSlipStore.addLeg({ ...leg });
    expect(events).toBe(1);
    expect(setItem).toHaveBeenCalledTimes(1);

    DraftSlipStore.getState();
    DraftSlipStore.getState();
    DraftSlipStore.getSlip();
    DraftSlipStore.getIdentity();

    expect(events).toBe(1);
    expect(setItem).toHaveBeenCalledTimes(1);
    window.removeEventListener(DRAFT_SLIP_UPDATED_EVENT, onUpdate);
  });

  it('notifies subscribers exactly once for one mutation', () => {
    const listener = vi.fn();
    const unsubscribe = DraftSlipStore.subscribe(listener);

    DraftSlipStore.addLeg({ ...leg });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0]?.[0].legs).toHaveLength(1);
    unsubscribe();
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
