import { Suspense } from 'react';

import { StressTestSecondaryPanels } from '@/src/components/xray/StressTestSecondaryPanels';
import { XRayBriefing } from '@/src/components/xray/XRayBriefing';
import { XRayVisualDetails } from '@/src/components/xray/XRayVisualDetails';

export default function StressTestPage() {
  return (
    <Suspense fallback={null}>
      <div className="mx-auto max-w-6xl space-y-6 px-3 py-4 sm:px-5 sm:py-6">
        <XRayBriefing />
        <XRayVisualDetails />
        <StressTestSecondaryPanels />
      </div>
    </Suspense>
  );
}
