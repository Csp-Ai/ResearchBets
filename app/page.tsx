import React from 'react';

import { getLandingSpineFromSearch } from '@/src/components/landing/BoardPreviewSSR';
import { FrontdoorLandingClient } from '@/src/components/landing/FrontdoorLandingClient';
import { BDAStrip, Credibility30s, TrustNote } from '@/src/components/landing/LandingCompactModules';
import { TruthSpineHeader } from '@/src/components/ui/TruthSpineHeader';

type HomePageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default function HomePage({ searchParams }: HomePageProps) {
  const spine = getLandingSpineFromSearch(searchParams);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 sm:py-8">
      <div className="mx-auto grid w-full max-w-7xl gap-6">
        <TruthSpineHeader
          title="Home"
          subtitle="Decision loop: Build → Analyze (Stress Test) → Track → Review."
          actions={[
            { label: 'Build from Board', href: `/today?sport=${spine.sport}&tz=${spine.tz}&date=${spine.date}&mode=${spine.mode}`, tone: 'primary' },
            { label: 'Analyze (Stress Test)', href: `/stress-test?sport=${spine.sport}&tz=${spine.tz}&date=${spine.date}&mode=${spine.mode}` },
            { label: 'Review', href: `/control?tab=review&sport=${spine.sport}&tz=${spine.tz}&date=${spine.date}&mode=${spine.mode}` }
          ]}
          traceId={spine.trace_id}
        />
        <FrontdoorLandingClient />

        <section className="border-t border-white/10 pt-4 pb-6" aria-label="landing-how-it-works">
          <details className="rounded-xl border border-white/10 bg-slate-900/35 p-3">
            <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">More</summary>
            <div className="mt-4 grid gap-4">
              <BDAStrip spine={spine} />
              <Credibility30s spine={spine} />
              <section className="rounded-xl border border-white/10 bg-slate-900/50 p-3">
                <h3 className="text-sm font-semibold text-slate-100">Latest run</h3>
                <p className="mt-1 text-sm text-slate-300">No live run opened yet. Demo sample stays available so the loop always has a starting point.</p>
              </section>
              <section className="rounded-xl border border-white/10 bg-slate-900/50 p-3">
                <h3 className="text-sm font-semibold text-slate-100">Learned today</h3>
                <p className="mt-1 text-sm text-slate-300">Process note: avoid stacking highly correlated legs without a volatility check.</p>
              </section>
              <TrustNote spine={spine} />
            </div>
          </details>
        </section>
      </div>
    </main>
  );
}
