import { Suspense } from 'react';

import SlipPageClient from './SlipPageClient';
import { Skeleton } from '@/src/components/ui/Skeleton';

export const dynamic = 'force-dynamic';

function SlipSkeleton() {
  return (
    <section className="mx-auto max-w-7xl space-y-4" aria-hidden>
      <header className="space-y-2">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-4 w-[32rem] max-w-full" />
      </header>
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
        {[1, 2, 3].map((row) => (
          <div key={row} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/70 p-3">
            <div className="space-y-2">
              <Skeleton className="h-3 w-40" />
              <Skeleton className="h-3 w-64" />
            </div>
            <Skeleton className="h-7 w-24" />
          </div>
        ))}
      </div>
      <Skeleton className="h-12 w-full" />
    </section>
  );
}

export default function SlipPage() {
  return (
    <Suspense fallback={<SlipSkeleton />}>
      <SlipPageClient />
    </Suspense>
  );
}
