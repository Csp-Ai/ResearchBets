'use client';

import { useEffect, useState } from 'react';

import type { SlipBuilderLeg } from '@/features/betslip/SlipBuilder';
import { DraftSlipStore } from '@/src/core/slips/draftSlipStore';

export function useDraftSlip() {
  const [slip, setSlip] = useState<SlipBuilderLeg[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setSlip(DraftSlipStore.getSlip());
    setIsHydrated(true);
    return DraftSlipStore.subscribe(setSlip);
  }, []);

  return {
    slip,
    isHydrated,
    getSlip: DraftSlipStore.getSlip,
    addLeg: DraftSlipStore.addLeg,
    removeLeg: DraftSlipStore.removeLeg,
    updateLeg: DraftSlipStore.updateLeg,
    setSlip: DraftSlipStore.setSlip,
    clearSlip: DraftSlipStore.clearSlip
  };
}
