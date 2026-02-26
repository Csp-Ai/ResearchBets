import { Suspense } from 'react';

import { LandingPageClient } from '@/src/components/landing/LandingPageClient';

export default function HomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#09090c]" aria-hidden />}>
      <LandingPageClient />
    </Suspense>
  );
}
