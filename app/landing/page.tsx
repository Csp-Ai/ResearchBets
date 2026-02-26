import { Suspense } from 'react';

import LandingMarketingClient from './LandingMarketingClient';

export default function LandingPage() {
  return (
    <Suspense fallback={null}>
      <LandingMarketingClient />
    </Suspense>
  );
}
