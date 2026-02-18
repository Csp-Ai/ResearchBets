import Link from 'next/link';

import { BetTrackerShell } from '@/features/tracker/components/BetTrackerShell';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-wide text-sky-400">ResearchBets V2</p>
        <h1 className="text-3xl font-bold">Game Research Dashboard</h1>
        <p className="text-slate-400">
          Anonymous-first workflow for ingesting bet slips, tracking outcomes, and surfacing
          performance insights.
        </p>
        <Link className="text-sm text-sky-300 underline hover:text-sky-200" href="/ingest">
          Open dedicated ingestion page
        </Link>
      </header>
      <BetTrackerShell />
    </div>
  );
}
