'use client';

import React from 'react';
import Link from 'next/link';

export type AnalyzeLeg = {
  id: string;
  selection: string;
  market?: string;
  line?: string;
  odds?: string;
  l5: number;
  l10: number;
  season?: number;
  vsOpp?: number;
  risk: 'strong' | 'caution' | 'weak';
  divergence?: boolean;
};

export function EmptyStateBettor() {
  return <div className="rounded-2xl border border-slate-800/70 bg-slate-900/50 p-6 text-sm text-slate-400">Paste a slip or build one to get your verdict.</div>;
}

export function VerdictHero({ confidence, weakestLeg, reasons }: { confidence: number; weakestLeg: AnalyzeLeg | null; reasons: string[] }) {
  const riskLabel = confidence >= 70 ? 'Strong' : confidence >= 55 ? 'Caution' : 'Weak';
  return (
    <section className="rounded-2xl border border-slate-800/70 bg-slate-900/60 p-5">
      <p className="text-xs uppercase tracking-wide text-slate-400">Verdict</p>
      <div className="mt-2 flex flex-wrap items-end gap-6">
        <p className="text-5xl font-semibold">{confidence}%</p>
        <div>
          <p className="text-sm text-slate-400">Risk level</p>
          <p className="text-lg font-semibold">{riskLabel}</p>
        </div>
        <div>
          <p className="text-sm text-slate-400">Weakest leg</p>
          <p className="text-lg">{weakestLeg?.selection ?? 'Not enough data yet'}</p>
        </div>
      </div>
      <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-slate-300">
        {reasons.map((reason) => <li key={reason}>{reason}</li>)}
      </ul>
    </section>
  );
}

export function LegCardCompact({ leg, onRemove }: { leg: AnalyzeLeg; onRemove: () => void }) {
  const tone = leg.risk === 'strong' ? 'border-emerald-500/40' : leg.risk === 'caution' ? 'border-amber-500/40' : 'border-rose-500/40';
  return (
    <li className={`rounded-xl border bg-slate-950/50 p-3 ${tone}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{leg.selection}</p>
          <p className="text-xs text-slate-400">{leg.market} {leg.line} {leg.odds}</p>
        </div>
        <button className="text-xs text-rose-300" type="button" onClick={onRemove}>Remove</button>
      </div>
      <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-300">
        <span>L5 {leg.l5}%</span><span>L10 {leg.l10}%</span>
        {typeof leg.season === 'number' ? <span>Season {leg.season}%</span> : null}
        {typeof leg.vsOpp === 'number' ? <span>vs Opp {leg.vsOpp}%</span> : null}
        {leg.divergence ? <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-amber-200">Books disagree</span> : null}
      </div>
    </li>
  );
}

export function LegRankList({ legs, onRemove }: { legs: AnalyzeLeg[]; onRemove: (id: string) => void }) {
  return <ul className="space-y-2">{legs.map((leg) => <LegCardCompact key={leg.id} leg={leg} onRemove={() => onRemove(leg.id)} />)}</ul>;
}

export function SlipActionsBar({ onRemoveWeakest, onRerun, canTrack }: { onRemoveWeakest: () => void; onRerun: () => void; canTrack: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" className="rounded bg-rose-600 px-3 py-1.5 text-sm" onClick={onRemoveWeakest}>Remove weakest leg</button>
      <button type="button" className="rounded border border-slate-700 px-3 py-1.5 text-sm" onClick={onRerun}>Re-run research</button>
      {canTrack ? <button type="button" className="rounded border border-emerald-700 px-3 py-1.5 text-sm">Track bet</button> : null}
    </div>
  );
}

export function AdvancedDrawer({ children, developerMode }: { children: React.ReactNode; developerMode: boolean }) {
  return (
    <details className="rounded-xl border border-slate-800/70 bg-slate-900/40 p-3" data-testid="advanced-drawer">
      <summary className="cursor-pointer text-sm font-semibold">Advanced</summary>
      <div className="mt-3 space-y-2 text-xs text-slate-300">{children}
        {developerMode ? <Link href="/traces" className="text-cyan-300 underline">Open run details</Link> : null}
      </div>
    </details>
  );
}
