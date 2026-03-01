import { Suspense } from 'react';
import { notFound } from 'next/navigation';

import { TracesIndexContent } from '@/src/components/terminal/TracesIndexContent';

export default function TracesIndexPage() {
  if (process.env.NODE_ENV !== 'development') return notFound();

  return (
    <Suspense fallback={<div className="p-6 text-sm opacity-70">Loading…</div>}>
      <TracesIndexContent />
    </Suspense>
  );
}
