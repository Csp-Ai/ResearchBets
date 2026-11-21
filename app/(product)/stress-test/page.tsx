import { Suspense } from 'react';

import { StressTestContent } from '@/src/components/xray/StressTestContent';

export default function StressTestPage() {
  return (
    <Suspense fallback={null}>
      <div className="mx-auto max-w-6xl space-y-6 px-3 py-4 sm:px-5 sm:py-6">
        <StressTestContent />
      </div>
    </Suspense>
  );
}
