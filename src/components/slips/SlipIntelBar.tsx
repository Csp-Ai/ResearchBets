'use client';

import { useMemo, useState } from 'react';

import type { SlipIntelLeg } from '@/src/core/slips/slipIntelligence';
import { buildSlipStructureReport } from '@/src/core/slips/slipIntelligence';

export function SlipIntelBar({ legs, className = '' }: { legs: SlipIntelLeg[]; className?: string }) {
  const [open, setOpen] = useState(false);
  const report = useMemo(() => buildSlipStructureReport(legs, { mode: 'demo' }), [legs]);
  const topCluster = report.script_clusters[0];
  const topSeverity = report.correlation_edges.find((edge) => edge.severity === 'high')?.severity
    ?? report.correlation_edges.find((edge) => edge.severity === 'med')?.severity
    ?? report.correlation_edges.find((edge) => edge.severity === 'low')?.severity
    ?? 'low';
  const weakestLeg = report.legs.find((leg) => leg.leg_id === report.weakest_leg_id);

  return (
    <section className={`rounded-xl border border-cyan-900/70 bg-slate-950/50 p-3 ${className}`}>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="rounded-full border border-cyan-500/40 px-2 py-1">Correlation edges {report.correlation_edges.length} ({topSeverity})</span>
        <span className="rounded-full border border-amber-500/40 px-2 py-1">Weakest {weakestLeg?.player ?? weakestLeg?.notes ?? report.weakest_leg_id ?? 'n/a'}</span>
        <span className="rounded-full border border-white/20 px-2 py-1">Exposure {topCluster ? `${topCluster.label} (${topCluster.leg_ids.length})` : 'No active game'}</span>
        <button type="button" className="rounded-full border border-white/20 px-2 py-1 text-slate-200 hover:border-cyan-400" onClick={() => setOpen((value) => !value)}>
          {open ? 'Hide fragile spots' : `What's fragile? (${report.failure_forecast.top_reasons.length})`}
        </button>
      </div>
      {open ? (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-300">
          {report.failure_forecast.top_reasons.slice(0, 3).map((hint) => <li key={hint}>{hint}</li>)}
        </ul>
      ) : null}
    </section>
  );
}
