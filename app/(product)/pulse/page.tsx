import { Suspense } from 'react';

import { TicketPulsePage } from '@/src/components/track/TicketPulsePage';

export const dynamic = 'force-dynamic';

export default function PulsePage() {
  return (
    <Suspense fallback={null}>
      <TicketPulsePage />
    </Suspense>
  );
}
