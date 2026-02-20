import { Suspense } from 'react';
import { notFound } from 'next/navigation';

import TraceDetailPageClient from './TraceDetailPageClient';

export default function TraceDetailPage({ params }: { params: { trace_id: string } }) {
  if (process.env.NODE_ENV !== 'development') return notFound();

  return (
    <Suspense fallback={<div className="p-6 text-sm opacity-70">Loading…</div>}>
      <TraceDetailPageClient params={params} />
    </Suspense>
  );
}
