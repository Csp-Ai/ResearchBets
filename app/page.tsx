import { Suspense } from 'react';

import HomeLandingClient from '@/app/HomeLandingClient';

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomeLandingClient />
    </Suspense>
  );
}
