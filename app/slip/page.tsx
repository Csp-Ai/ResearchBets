import { Suspense } from 'react';

import SlipPageClient from './SlipPageClient';

export const dynamic = 'force-dynamic';

function SlipSkeleton() {
  return (
    <section className="mx-auto max-w-7xl space-y-4 animate-pulse" aria-hidden>
      <header className="space-y-2">
        <div className="h-10 w-56 rounded bg-slate-800" />
        <div className="h-4 w-[32rem] max-w-full rounded bg-slate-800" />
      </header>
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
        {[1, 2, 3].map((row) => (
          <div key={row} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/70 p-3">
            <div className="space-y-2">
              <div className="h-3 w-40 rounded bg-slate-800" />
              <div className="h-3 w-64 rounded bg-slate-800" />
            </div>
            <div className="h-7 w-24 rounded-md bg-slate-800" />
          </div>
        ))}
      </div>
      <div className="h-12 w-full rounded-xl bg-cyan-900/30" />
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
