'use client';

import { BetSlipIngestionForm } from '@/features/betslip/components/BetSlipIngestionForm';

export default function IngestionPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 py-4 md:py-8">
      <header className="space-y-2 text-center">
        <h1 className="text-4xl font-semibold">Paste Slip</h1>
        <p className="text-sm text-slate-400">Drop your ticket text, parse legs instantly, and jump to analyze.</p>
      </header>
      <BetSlipIngestionForm />
    </div>
  );
}
