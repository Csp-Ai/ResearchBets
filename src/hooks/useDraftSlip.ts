'use client';

import { useEffect, useState } from 'react';

import type { SlipBuilderLeg } from '@/features/betslip/SlipBuilder';
import { DraftSlipStore } from '@/src/core/slips/draftSlipStore';

export function useDraftSlip() {
  const [slip, setSlip] = useState<SlipBuilderLeg[]>([]);

  useEffect(() => {
    setSlip(DraftSlipStore.getSlip());
    return DraftSlipStore.subscribe(setSlip);
  }, []);

  return {
    slip,
    getSlip: DraftSlipStore.getSlip,
    addLeg: DraftSlipStore.addLeg,
    removeLeg: DraftSlipStore.removeLeg,
    updateLeg: DraftSlipStore.updateLeg,
    clearSlip: DraftSlipStore.clearSlip
  };
}
