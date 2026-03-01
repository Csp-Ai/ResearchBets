import React from 'react';
import dynamic from 'next/dynamic';

import { getLandingSpineFromSearch } from '@/src/components/landing/BoardPreviewSSR';

const HomeLandingClientV2 = dynamic(() => import('@/app/HomeLandingClientV2'), { ssr: false });

type HomePageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default function HomePage({ searchParams }: HomePageProps) {
  const spine = getLandingSpineFromSearch(searchParams);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-7xl">
        <HomeLandingClientV2 spine={spine} />
      </div>
    </main>
  );
}
