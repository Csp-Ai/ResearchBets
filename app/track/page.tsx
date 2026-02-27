import { Suspense } from 'react';

import { TrackPageClient } from './TrackPageClient';
import { TrackSkeleton } from './TrackSkeleton';

export const dynamic = 'force-dynamic';

export default function TrackPage() {
  return (
    <Suspense fallback={<TrackSkeleton />}>
      <TrackPageClient />
    </Suspense>
  );
}
