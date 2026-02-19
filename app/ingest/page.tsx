'use client';

import { BetSlipIngestionForm } from '@/features/betslip/components/BetSlipIngestionForm';

export default function IngestionPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 py-8">
      <header className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">Paste Slip</h1>
        <p className="text-slate-400">Drop in your bet slip, then jump straight to Analyze.</p>
      </header>
      <BetSlipIngestionForm />
    </div>
  );
}
