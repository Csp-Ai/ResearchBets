'use client';

import { useMemo, useState } from 'react';

import type { SlipIntelLeg } from '@/src/core/slips/slipIntelligence';
import { deriveSlipRiskSummary } from '@/src/core/slips/slipRiskSummary';
import { presentRecommendation } from '@/src/core/slips/recommendationPresentation';

export function SlipIntelBar({ legs, className = '' }: { legs: SlipIntelLeg[]; className?: string }) {
  const [open, setOpen] = useState(false);
  const risk = useMemo(() => deriveSlipRiskSummary(legs), [legs]);

  if (legs.length < 2) return null;

  return (
    <section className={`rounded-2xl border border-white/10 bg-white/[0.03] p-4 ${className}`} data-testid="slip-risk-panel">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="m-0 text-sm font-semibold text-slate-100">{presentRecommendation(risk.recommendation)}</p>
          <p className="mt-1 text-sm text-slate-300">
            Correlation {risk.correlationFlag ? 'high' : 'managed'} · Fragility {risk.fragilityScore}/100 · Weakest {risk.weakestLeg}
          </p>
        </div>
        <button
          type="button"
          className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-slate-200 transition hover:border-cyan-400"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? 'Hide details' : 'Show details'}
        </button>
      </div>

      {open ? (
        <div className="mt-3 space-y-3 text-xs text-slate-300">
          <p className="m-0">Confidence {risk.confidencePct}% · Risk {risk.riskLabel} · Volatility {risk.volatilitySummary}</p>
          <ul className="m-0 list-disc space-y-1 pl-5">
            {risk.reasonBullets.map((hint) => <li key={hint}>{hint}</li>)}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
