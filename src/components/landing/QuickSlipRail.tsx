'use client';

import React from 'react';
import Link from 'next/link';

import type { SlipBuilderLeg } from '@/features/betslip/SlipBuilder';
import { Panel, PanelHeader } from '@/src/components/landing/ui';

export function QuickSlipRail({
  slip,
  runAnalysisHref,
  sampleSlipHref,
  latestRunHref,
  onRemoveLeg,
  onEditLeg
}: {
  slip: SlipBuilderLeg[];
  runAnalysisHref: string;
  sampleSlipHref: string;
  latestRunHref: string | null;
  onRemoveLeg: (id: string) => void;
  onEditLeg: (leg: SlipBuilderLeg) => void;
}) {
  return (
    <Panel data-testid="quick-slip-rail">
      <PanelHeader title="QuickSlip" subtitle="Draft legs ready for a fast run" />

      {slip.length === 0 ? (
        <div className="space-y-2" data-testid="quick-slip-empty-state">
          <p className="text-xs text-white/60">No legs yet. Start from any entry point.</p>
          <div className="flex flex-wrap gap-2">
            <Link href="/slips/new" className="rounded-xl border border-white/20 px-3 py-1.5 text-sm text-slate-100">Paste slip</Link>
            <Link href={sampleSlipHref} className="rounded-xl border border-white/20 px-3 py-1.5 text-sm text-slate-100">Try sample slip</Link>
            <a href="#board-section" className="rounded-xl border border-white/20 px-3 py-1.5 text-sm text-slate-100">Build from Board</a>
          </div>
        </div>
      ) : (
        <ul className="space-y-2">
          {slip.map((leg) => (
            <li key={leg.id} className="rounded-xl border border-white/10 bg-slate-900/65 p-2">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm text-slate-100">{leg.player} · {leg.marketType.toUpperCase()}</p>
                <button type="button" onClick={() => onRemoveLeg(leg.id)} className="text-xs text-slate-300 underline underline-offset-2">Remove</button>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-1.5 text-xs">
                <label className="flex items-center gap-1 rounded border border-white/10 px-2 py-1 text-slate-300">
                  line
                  <input
                    value={leg.line}
                    onChange={(event) => onEditLeg({ ...leg, line: event.target.value })}
                    className="w-full bg-transparent text-slate-100 outline-none"
                    aria-label={`Edit line ${leg.player}`}
                  />
                </label>
                <label className="flex items-center gap-1 rounded border border-white/10 px-2 py-1 text-slate-300">
                  odds
                  <input
                    value={leg.odds ?? ''}
                    onChange={(event) => onEditLeg({ ...leg, odds: event.target.value })}
                    className="w-full bg-transparent text-slate-100 outline-none"
                    aria-label={`Edit odds ${leg.player}`}
                  />
                </label>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Link
          href={runAnalysisHref}
          aria-disabled={slip.length === 0}
          className="rounded-xl border border-cyan-300/60 bg-cyan-400 px-3 py-1.5 text-sm font-semibold text-slate-950"
        >
          Run analysis
        </Link>
        {latestRunHref ? <Link href={latestRunHref} className="text-xs text-cyan-100 underline underline-offset-2">Open latest run</Link> : null}
      </div>
    </Panel>
  );
}
