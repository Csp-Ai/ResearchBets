import { Suspense } from 'react';

import { LiveTruthGuard } from '@/src/components/track/LiveTruthGuard';
import { TicketPulseHero } from '@/src/components/track/TicketPulseHero';
import { TrackPageClient } from './TrackPageClient';
import { TrackSkeleton } from './TrackSkeleton';

export const dynamic = 'force-dynamic';

export default function TrackPage() {
  return (
    <Suspense fallback={<TrackSkeleton />}>
      <div className="mx-auto max-w-6xl space-y-4 pb-20">
        <LiveTruthGuard />
        <TicketPulseHero />
        <TrackPageClient />
      </div>
    </Suspense>
  );
}
