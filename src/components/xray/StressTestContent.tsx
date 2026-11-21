'use client';

import { ReviewedTicketXRay } from '@/src/components/xray/ReviewedTicketXRay';
import { StressTestSecondaryPanels } from '@/src/components/xray/StressTestSecondaryPanels';
import { XRayBriefing } from '@/src/components/xray/XRayBriefing';
import { XRayVisualDetails } from '@/src/components/xray/XRayVisualDetails';
import { useDraftSlip } from '@/src/hooks/useDraftSlip';

export function StressTestContent() {
  const { draft, isHydrated } = useDraftSlip();

  if (isHydrated && draft.ingestion?.confirmedLegs?.length) {
    return <ReviewedTicketXRay ingestion={draft.ingestion} />;
  }

  return (
    <>
      <XRayBriefing />
      <XRayVisualDetails />
      <StressTestSecondaryPanels />
    </>
  );
}
