import { Suspense } from 'react';

import DashboardPageClient from './DashboardPageClient';

export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  return (
    <section className="space-y-3">
      <header>
        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Truth Loop</p>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
      </header>
      <Suspense fallback={<div className="rounded border border-white/10 p-4 text-sm text-slate-300">Loading dashboard…</div>}>
        <DashboardPageClient />
      </Suspense>
    </section>
  );
}
