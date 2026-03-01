import { Suspense } from 'react';

import DiscoverPageClient from './DiscoverPageClient';

export const dynamic = 'force-dynamic';

export default function DiscoverPage() {
  return (
    <section className="space-y-3">
      <header>
        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Scout → Draft</p>
        <h1 className="text-2xl font-semibold">Discover</h1>
      </header>

      <div className="flex flex-wrap gap-2 text-sm">
        <span className="rounded border border-white/20 px-3 py-2">Track slip</span>
        <span className="rounded border border-white/20 px-3 py-2">Stress-test</span>
        <span className="rounded border border-white/20 px-3 py-2">Open Tonight</span>
      </div>
      <Suspense fallback={<div className="rounded border border-white/10 p-4 text-sm text-slate-300">Loading discover signals…</div>}>
        <DiscoverPageClient />
      </Suspense>
    </section>
  );
}
