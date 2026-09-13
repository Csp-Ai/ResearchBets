import { Suspense } from 'react';

import ResearchPageContent from '@/src/components/research/ResearchPageContent';
import { TicketXRay } from '@/src/components/xray/TicketXRay';

export default function StressTestPage() {
  return (
    <Suspense fallback={null}>
      <div className="mx-auto max-w-7xl space-y-6 px-3 py-4 sm:px-5 sm:py-6">
        <TicketXRay />
        <div id="deep-analysis" className="scroll-mt-4">
          <ResearchPageContent />
        </div>
      </div>
    </Suspense>
  );
}
