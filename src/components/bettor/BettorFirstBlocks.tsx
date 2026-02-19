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

export function EmptyStateBettor({ onPaste }: { onPaste: () => void }) {
  return (
    <section className="rb-card space-y-5" data-testid="research-empty-state">
      <div>
        <h2 className="text-xl font-semibold">From raw ticket to clear verdict</h2>
        <p className="mt-1 text-sm text-slate-400">Know your downside before placing the slip.</p>
      </div>
      <ul className="space-y-2 text-sm text-slate-300">
        <li>• L5/L10 hit-rate context per leg</li>
        <li>• Weakest leg called out immediately</li>
        <li>• Line disagreement and injury risk flags</li>
      </ul>
      <pre className="rounded-xl border border-slate-800/60 bg-slate-950/75 p-4 text-xs text-slate-300">
{`Jayson Tatum over 29.5 points (-110)
Luka Doncic over 8.5 assists (-120)
LeBron James over 6.5 rebounds (-105)`}
      </pre>
      <button type="button" className="rb-btn-primary" onClick={onPaste}>Paste slip</button>
    </section>
  );
}

export function VerdictHero({ confidence, weakestLeg, reasons }: { confidence: number; weakestLeg: AnalyzeLeg | null; reasons: string[] }) {
  const riskLabel = confidence >= 70 ? 'Strong' : confidence >= 55 ? 'Caution' : 'Weak';
  const tone = riskLabel === 'Strong' ? 'tone-strong' : riskLabel === 'Caution' ? 'tone-caution' : 'tone-weak';

  return (
    <section className="rb-card rb-hero space-y-5" data-testid="verdict-hero">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">Verdict</p>
          <p className="text-5xl font-semibold leading-none md:text-6xl">{confidence}%</p>
          <p className="mt-1 text-sm text-slate-400">Confidence to clear as currently built.</p>
        </div>
        <span className={`rb-chip ${tone}`}>{riskLabel} confidence</span>
      </div>

      <div className="rounded-xl border border-slate-800/60 bg-slate-950/55 p-4">
        <p className="text-xs uppercase tracking-wide text-slate-500">Weakest leg</p>
        <p className="mt-1 text-lg text-rose-200">{weakestLeg?.selection ?? 'Not enough data yet'}</p>
      </div>

      <ul className="space-y-1.5 text-sm text-slate-200">
        {reasons.map((reason) => <li key={reason}>• {reason}</li>)}
      </ul>
    </section>
  );
}

export function LegCardCompact({ leg, onRemove }: { leg: AnalyzeLeg; onRemove: () => void }) {
  const tone = leg.risk === 'strong' ? 'tone-strong' : leg.risk === 'caution' ? 'tone-caution' : 'tone-weak';

  return (
    <li className="flex flex-col gap-3 py-3 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0 md:w-[34%]">
        <p className="truncate font-medium text-slate-100">{leg.selection}</p>
        <p className="text-xs text-slate-400">{leg.market} {leg.line} {leg.odds}</p>
      </div>

      <div className="flex flex-wrap gap-1.5 md:w-[38%]">
        <span className="rb-chip">L5 {leg.l5}%</span>
        <span className="rb-chip">L10 {leg.l10}%</span>
        {typeof leg.season === 'number' ? <span className="rb-chip">Season {leg.season}%</span> : null}
        {typeof leg.vsOpp === 'number' ? <span className="rb-chip">vs Opp {leg.vsOpp}%</span> : null}
      </div>

      <div className="flex items-center gap-2 md:w-[28%] md:justify-end">
        {leg.divergence ? <span className="rb-chip tone-caution">Books disagree</span> : null}
        <span className={`rb-chip ${tone}`}>{leg.risk}</span>
        <button className="text-xs text-cyan-300" type="button">Why</button>
        <button className="text-xs text-rose-300" type="button" onClick={onRemove}>Remove</button>
      </div>
    </li>
  );
}

export function LegRankList({ legs, onRemove }: { legs: AnalyzeLeg[]; onRemove: (id: string) => void }) {
  return (
    <ul className="divide-y divide-slate-800/60">
      {legs.map((leg) => <LegCardCompact key={leg.id} leg={leg} onRemove={() => onRemove(leg.id)} />)}
    </ul>
  );
}

export function SlipActionsBar({ onRemoveWeakest, onRerun, canTrack }: { onRemoveWeakest: () => void; onRerun: () => void; canTrack: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold" onClick={onRemoveWeakest}>Remove weakest</button>
      <button type="button" className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium" onClick={onRerun}>Rerun</button>
      {canTrack ? <button type="button" className="rounded-xl border border-emerald-700 px-4 py-2 text-sm font-medium">Track</button> : null}
    </div>
  );
}

export function AdvancedDrawer({ children, developerMode }: { children: React.ReactNode; developerMode: boolean }) {
  return (
    <details className="rounded-xl border border-slate-800/50 bg-slate-950/40 px-3 py-2" data-testid="advanced-drawer">
      <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-slate-400">Advanced</summary>
      <div className="mt-3 space-y-2 text-xs text-slate-300">{children}
        {developerMode ? <Link href="/traces" className="text-cyan-300 underline">Open run details</Link> : null}
      </div>
    </details>
  );
}
