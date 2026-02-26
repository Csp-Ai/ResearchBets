'use client';

import React from 'react';

import type { SlipStructureReport } from '@/src/core/contracts/slipStructureReport';

type TodayLoopPanelProps = {
  slipCount: number;
  report?: SlipStructureReport;
  modeLabel: string;
  healthHint?: string;
  onAddTopProps: () => void;
  onOpenSlip: () => void;
  onRunRisk: () => void;
  onOpenReview: () => void;
};

export function TodayLoopPanel({
  slipCount,
  report,
  modeLabel,
  healthHint,
  onAddTopProps,
  onOpenSlip,
  onRunRisk,
  onOpenReview
}: TodayLoopPanelProps) {
  const weakestLeg = report?.legs.find((leg) => leg.leg_id === report.weakest_leg_id);

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-4" aria-label="today-loop-panel">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-semibold">Today</h2>
        <span className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-300">{modeLabel}</span>
      </div>
      {healthHint ? <p className="mt-2 text-xs text-slate-400">{healthHint}</p> : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={onAddTopProps} className="rounded bg-cyan-400 px-3 py-2 text-sm font-semibold text-slate-950">Add top props</button>
        <button type="button" onClick={onOpenSlip} className="rounded border border-slate-600 px-3 py-2 text-sm">Open slip ({slipCount})</button>
        <button type="button" onClick={onRunRisk} className="rounded border border-slate-600 px-3 py-2 text-sm">Run risk</button>
        <button type="button" onClick={onOpenReview} className="rounded border border-slate-600 px-3 py-2 text-sm">Open review</button>
      </div>

      <div className="mt-4 rounded-lg border border-slate-700 bg-slate-950/40 p-3">
        <p className="text-sm font-semibold">Structural Risk Preview</p>
        {slipCount === 0 ? (
          <p className="mt-2 text-sm text-slate-300">Add 2–4 props to start.</p>
        ) : (
          <>
            <p className="mt-2 text-sm text-slate-200">
              Weakest leg: {weakestLeg ? `${weakestLeg.player ?? weakestLeg.market} ${weakestLeg.market} ${weakestLeg.line ?? ''}` : 'Run risk to score legs'}
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-300">
              {(report?.failure_forecast.top_reasons ?? ['Run risk to generate structural reasons.']).slice(0, 3).map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-slate-400">Overlaps: {report?.correlation_edges.length ?? 0}</p>
          </>
        )}
      </div>
    </section>
  );
}
