'use client';

import { useMemo, useState } from 'react';

import type { SlipIntelLeg } from '@/src/core/slips/slipIntelligence';
import { computeSlipIntelligence } from '@/src/core/slips/slipIntelligence';

export function SlipIntelBar({ legs, className = '' }: { legs: SlipIntelLeg[]; className?: string }) {
  const [open, setOpen] = useState(false);
  const intel = useMemo(() => computeSlipIntelligence(legs), [legs]);
  const topGame = intel.exposureSummary.topGames[0];

  return (
    <section className={`rounded-xl border border-cyan-900/70 bg-slate-950/50 p-3 ${className}`}>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="rounded-full border border-cyan-500/40 px-2 py-1">Correlation {intel.correlationScore}%</span>
        <span className="rounded-full border border-amber-500/40 px-2 py-1">Volatility {intel.volatilityTier}</span>
        <span className="rounded-full border border-white/20 px-2 py-1">Exposure {topGame ? `${topGame.game} (${topGame.count})` : 'No active game'}</span>
        <button type="button" className="rounded-full border border-white/20 px-2 py-1 text-slate-200 hover:border-cyan-400" onClick={() => setOpen((value) => !value)}>
          {open ? 'Hide fragile spots' : `What's fragile? (${intel.weakestLegHints.length})`}
        </button>
      </div>
      {open ? (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-300">
          {intel.weakestLegHints.map((hint) => <li key={hint}>{hint}</li>)}
        </ul>
      ) : null}
    </section>
  );
}
