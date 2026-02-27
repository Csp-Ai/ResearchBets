import React from 'react';

import { BoardPreviewSSR, getLandingSpineFromSearch } from '@/src/components/landing/BoardPreviewSSR';
import { FrontdoorLandingClient } from '@/src/components/landing/FrontdoorLandingClient';
import { BDAStrip, Credibility30s, PostmortemUploadWedge, TrustNote } from '@/src/components/landing/LandingCompactModules';
import { TonightPreviewPanel } from '@/src/components/landing/TonightPreviewPanel';

type HomePageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default function HomePage({ searchParams }: HomePageProps) {
  const spine = getLandingSpineFromSearch(searchParams);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 sm:py-8">
      <div className="mx-auto grid w-full max-w-7xl gap-6">
        <BoardPreviewSSR spine={spine} />
        <TonightPreviewPanel />
        <FrontdoorLandingClient />

        <section className="border-t border-white/10 pt-4 pb-6" aria-label="landing-how-it-works">
          <details className="rounded-xl border border-white/10 bg-slate-900/35 p-3">
            <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">More</summary>
            <div className="mt-4 grid gap-4">
              <BDAStrip spine={spine} />
              <Credibility30s spine={spine} />
              <TrustNote spine={spine} />
              <PostmortemUploadWedge />
            </div>
          </details>
        </section>
      </div>
    </main>
  );
}
