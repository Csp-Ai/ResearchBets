'use client';

import React from 'react';
import Link from 'next/link';

type GuidedActionsCardProps = {
  legsCount: number;
  canSaveBet?: boolean;
  onPasteSlip: () => void;
  onRunResearch: () => void;
  onOpenTrace: () => void;
  saveBetHref?: string;
};

function actionClass(primary: boolean): string {
  return primary
    ? 'rounded bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-slate-100 hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-50'
    : 'rounded border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:border-cyan-500/60';
}

export function GuidedActionsCard({
  legsCount,
  canSaveBet = false,
  onPasteSlip,
  onRunResearch,
  onOpenTrace,
  saveBetHref,
}: GuidedActionsCardProps) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
      <h2 className="text-sm font-semibold text-slate-100">Guided workflow</h2>
      <ol className="mt-3 space-y-3 text-xs text-slate-300">
        <li className="rounded border border-slate-800 bg-slate-950/60 p-3">
          <p className="font-medium text-slate-100">Step 1 · Add legs</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" onClick={onPasteSlip} className={actionClass(true)}>Paste slip</button>
            <Link href="/dashboard" className={actionClass(false)}>Go to Discover</Link>
          </div>
        </li>
        <li className="rounded border border-slate-800 bg-slate-950/60 p-3">
          <p className="font-medium text-slate-100">Step 2 · Run research</p>
          <div className="mt-2">
            <button type="button" onClick={onRunResearch} disabled={legsCount === 0} className={actionClass(true)}>Run / Rerun</button>
          </div>
        </li>
        <li className="rounded border border-slate-800 bg-slate-950/60 p-3">
          <p className="font-medium text-slate-100">Step 3 · Review verdict</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" onClick={onOpenTrace} className={actionClass(true)}>Open trace</button>
            {canSaveBet && saveBetHref ? <Link href={saveBetHref} className={actionClass(false)}>Save bet</Link> : null}
          </div>
        </li>
      </ol>
    </section>
  );
}
