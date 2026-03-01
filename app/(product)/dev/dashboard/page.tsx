import { notFound } from 'next/navigation';

import { DevDashboardPageClient } from './DevDashboardPageClient';

export default function DevDashboardPage() {
  if (process.env.NODE_ENV !== 'development') {
    notFound();
  }

  return <DevDashboardPageClient />;
}
