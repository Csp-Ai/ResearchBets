import React from 'react';

import { BoardPreviewSSR, getLandingSpineFromSearch } from '@/src/components/landing/BoardPreviewSSR';
import { FrontdoorLandingClient } from '@/src/components/landing/FrontdoorLandingClient';
import { BDAStrip, Credibility30s, TrustNote } from '@/src/components/landing/LandingCompactModules';

type HomePageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default function HomePage({ searchParams }: HomePageProps) {
  const spine = getLandingSpineFromSearch(searchParams);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 sm:py-8">
      <div className="mx-auto grid w-full max-w-6xl gap-6">
        <BoardPreviewSSR spine={spine} />
        <FrontdoorLandingClient />
        <section className="grid gap-4 pb-8">
          <BDAStrip spine={spine} />
          <Credibility30s spine={spine} />
          <TrustNote spine={spine} />
        </section>
      </div>
    </main>
  );
}
