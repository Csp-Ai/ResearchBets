'use client';

import { useMemo, useState } from 'react';

import type { SlipIntelLeg } from '@/src/core/slips/slipIntelligence';
import { deriveSlipRiskSummary } from '@/src/core/slips/slipRiskSummary';

export function SlipIntelBar({ legs, className = '' }: { legs: SlipIntelLeg[]; className?: string }) {
  const [open, setOpen] = useState(false);
  const risk = useMemo(() => deriveSlipRiskSummary(legs), [legs]);
  const showPanel = legs.length >= 2;

  if (!showPanel) return null;

  return (
    <section className={`rounded-xl border border-cyan-900/70 bg-slate-950/50 p-3 ${className}`} data-testid="slip-risk-panel">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="rounded-full border border-cyan-500/40 px-2 py-1">{risk.recommendation}</span>
        <span className="rounded-full border border-white/20 px-2 py-1">Confidence {risk.confidencePct}%</span>
        <span className="rounded-full border border-rose-500/40 px-2 py-1">Risk {risk.riskLabel}</span>
        <span className="rounded-full border border-amber-500/40 px-2 py-1">Weakest {risk.weakestLeg}</span>
        <span className="rounded-full border border-white/20 px-2 py-1">Fragility {risk.fragilityScore}/100</span>
        <span className="rounded-full border border-white/20 px-2 py-1">Correlation {risk.correlationFlag ? 'High' : 'Managed'}</span>
        <button type="button" className="rounded-full border border-white/20 px-2 py-1 text-slate-200 hover:border-cyan-400" onClick={() => setOpen((value) => !value)}>
          {open ? 'Hide risk detail' : 'Open risk detail'}
        </button>
      </div>
      <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-300">
        <span className="rounded-full border border-white/20 px-2 py-1">Volatility: {risk.volatilitySummary}</span>
        {risk.legVolatilityTags.map((leg) => <span key={leg.legId} className="rounded-full border border-white/15 px-2 py-1">{leg.volatility} · {leg.label}</span>)}
      </div>
      {open ? (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-300">
          {risk.reasonBullets.map((hint) => <li key={hint}>{hint}</li>)}
        </ul>
      ) : null}
    </section>
  );
}
