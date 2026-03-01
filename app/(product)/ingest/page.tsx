import { Suspense } from 'react';

import IngestPageClient from './IngestPageClient';

export default function IngestionPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm opacity-70">Loading…</div>}>
      <IngestPageClient />
    </Suspense>
  );
}
