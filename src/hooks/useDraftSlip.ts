'use client';

import { useEffect, useState } from 'react';

import type { SlipBuilderLeg } from '@/features/betslip/SlipBuilder';
import {
  DraftSlipStore,
  type DraftSlipIdentity,
  type DraftSlipState
} from '@/src/core/slips/draftSlipStore';

export function useDraftSlip() {
  const [draft, setDraft] = useState<DraftSlipState>({ legs: [] });
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setDraft(DraftSlipStore.getState());
    setIsHydrated(true);
    return DraftSlipStore.subscribe(setDraft);
  }, []);

  const identity: DraftSlipIdentity = {
    slip_id: draft.slip_id,
    trace_id: draft.trace_id
  };

  return {
    draft,
    slip: draft.legs,
    slip_id: draft.slip_id,
    trace_id: draft.trace_id,
    identity,
    isHydrated,
    getSlip: DraftSlipStore.getSlip,
    getState: DraftSlipStore.getState,
    ensureIdentity: DraftSlipStore.ensureIdentity,
    addLeg: DraftSlipStore.addLeg,
    removeLeg: DraftSlipStore.removeLeg,
    updateLeg: DraftSlipStore.updateLeg,
    setSlip: DraftSlipStore.setSlip,
    clearSlip: DraftSlipStore.clearSlip,
    replaceState: DraftSlipStore.replaceState
  };
}
