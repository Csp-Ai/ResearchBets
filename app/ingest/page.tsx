'use client';

import Link from 'next/link';

import { BetSlipIngestionForm } from '@/features/betslip/components/BetSlipIngestionForm';

export default function IngestionPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Slip Ingestion</h1>
        <p className="text-slate-400">Capture slips end-to-end for decision clarity telemetry.</p>
        <Link className="text-sm text-sky-300 underline hover:text-sky-200" href="/">
          Return to dashboard
        </Link>
      </header>
      <BetSlipIngestionForm />
    </div>
  );
}
