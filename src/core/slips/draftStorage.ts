import type { SlipBuilderLeg } from '@/features/betslip/SlipBuilder';

import { DraftSlipStore, DRAFT_SLIP_STORAGE_KEY, DRAFT_SLIP_UPDATED_EVENT } from './draftSlipStore';

export const SCOUT_DRAFT_STORAGE_KEY = DRAFT_SLIP_STORAGE_KEY;
export const SCOUT_DRAFT_UPDATED_EVENT = DRAFT_SLIP_UPDATED_EVENT;

export function readDraftLegs(): SlipBuilderLeg[] {
  return DraftSlipStore.getSlip();
}

export function writeDraftLegs(legs: SlipBuilderLeg[]): void {
  DraftSlipStore.clearSlip();
  legs.forEach((leg) => {
    DraftSlipStore.addLeg(leg);
  });
}

export function upsertDraftLeg(leg: SlipBuilderLeg): SlipBuilderLeg[] {
  return DraftSlipStore.addLeg(leg);
}
