'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { buildJournalEntry } from '@/src/core/journal/buildJournalEntry';
import { saveJournalEntry } from '@/src/core/journal/storage';
import { advanceDemoTracking } from '@/src/core/slips/demoSlipTracker';
import { loadSlip, saveSlip } from '@/src/core/slips/storage';
import type { SlipTrackingState } from '@/src/core/slips/trackingTypes';

const statusTone: Record<SlipTrackingState['status'], string> = {
  alive: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40',
  eliminated: 'bg-rose-500/15 text-rose-100 border-rose-400/40',
  settled: 'bg-slate-600/30 text-slate-100 border-slate-400/40'
};

export function TrackPageClient() {
  const params = useSearchParams();
  const slipId = params.get('slipId') ?? '';
  const [state, setState] = useState<SlipTrackingState | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!slipId) return;
    const loaded = loadSlip(slipId);
    if (!loaded) return;
    setState(loaded);
  }, [slipId]);

  useEffect(() => {
    if (!state) return;
    const timer = window.setInterval(() => {
      const next = advanceDemoTracking(state, new Date().toISOString());
      setState(next);
      saveSlip(next);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [state]);

  const analysis = useMemo(() => {
    if (!state) return { failureLeg: null as SlipTrackingState['legs'][number] | null, wouldHaveHit: [], runbacks: [] as SlipTrackingState['legs'] };
    const failureLeg = state.legs.find((leg) => leg.legId === state.eliminatedByLegId) ?? null;
    const wouldHaveHit = state.legs.filter((leg) => leg.outcome === 'hit' && leg.legId !== state.eliminatedByLegId);
    const runbacks = state.legs.filter((leg) => leg.outcome === 'hit' && (leg.volatility === 'low' || leg.volatility === 'medium') && (leg.convictionAtBuild ?? 0) >= 70);
    return { failureLeg, wouldHaveHit, runbacks };
  }, [state]);

  const onSaveJournal = () => {
    if (!state) return;
    saveJournalEntry(buildJournalEntry(state));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  if (!state) {
    return <section className="mx-auto max-w-4xl rounded-xl border border-slate-700 bg-slate-900/60 p-6">No tracked slip found. Build a draft and use <strong>Track slip</strong>.</section>;
  }

  return (
    <section className="mx-auto max-w-6xl space-y-4 pb-20">
      <header className="rounded-xl border border-slate-700 bg-slate-900/70 p-4 space-y-2">
        <p className="text-xs text-slate-400">Slip ID: {state.slipId}</p>
        <div className="flex items-center gap-2">
          <span className={`rounded-full border px-3 py-1 text-xs uppercase ${statusTone[state.status]}`}>{state.status}</span>
          {state.eliminatedByLegId ? <span className="text-sm text-rose-100">Eliminated by: {state.legs.find((leg) => leg.legId === state.eliminatedByLegId)?.player}</span> : null}
        </div>
        {state.status === 'eliminated' ? <p className="text-sm text-slate-300">Tracking remaining legs for learning.</p> : null}
      </header>

      <section className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
        <h2 className="text-lg font-semibold">Leg Tracker</h2>
        <ul className="mt-3 space-y-2">
          {state.legs.map((leg) => (
            <li key={leg.legId} className="rounded border border-slate-700 p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p>{leg.player} · {leg.market} {leg.line}</p>
                <div className="flex gap-2 text-xs">
                  <span className="rounded border border-white/20 px-2 py-0.5">{leg.outcome}</span>
                  <span className="rounded border border-amber-300/30 px-2 py-0.5">{leg.volatility}</span>
                </div>
              </div>
              {typeof leg.currentValue === 'number' && typeof leg.targetValue === 'number' ? (
                <div className="mt-2">
                  <p className="text-xs text-slate-300">Progress: {leg.currentValue} / {leg.targetValue}</p>
                  <div className="mt-1 h-2 rounded bg-slate-800">
                    <div className="h-2 rounded bg-cyan-400" style={{ width: `${Math.min(100, Math.max(0, (leg.currentValue / Math.max(0.01, leg.targetValue)) * 100))}%` }} />
                  </div>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      {(state.status === 'eliminated' || state.status === 'settled') ? (
        <section className="rounded-xl border border-slate-700 bg-slate-900/70 p-4 space-y-2">
          <h2 className="text-lg font-semibold">Postmortem Summary</h2>
          {analysis.failureLeg ? <p className="text-sm">Failure leg: {analysis.failureLeg.player} ({analysis.failureLeg.missType ?? 'unknown'})</p> : null}
          <p className="text-sm">Would-have-hit legs: {analysis.wouldHaveHit.length}</p>
          <ul className="list-disc pl-5 text-sm text-slate-300">
            {analysis.wouldHaveHit.map((leg) => <li key={leg.legId}>{leg.player} {leg.market} {leg.line}</li>)}
          </ul>
          <p className="text-sm">Runback candidates: {analysis.runbacks.length}</p>
          <ul className="list-disc pl-5 text-sm text-slate-300">
            {analysis.runbacks.map((leg) => <li key={`runback-${leg.legId}`}>{leg.player} {leg.market} {leg.line}</li>)}
          </ul>
          {analysis.failureLeg && (analysis.failureLeg.missType === 'variance' || analysis.failureLeg.missType === 'unknown') ? (
            <p className="rounded border border-amber-300/40 bg-amber-500/10 p-2 text-sm text-amber-100">Do not auto-blacklist. Need sample size.</p>
          ) : null}
        </section>
      ) : null}

      <div className="flex items-center gap-2">
        <button type="button" className="rounded border border-cyan-400/70 bg-cyan-500/10 px-4 py-2 text-sm" onClick={onSaveJournal}>Save to Journal</button>
        {saved ? <span className="text-xs text-emerald-300">Saved</span> : null}
        <Link href="/journal" className="text-xs underline text-slate-300">Open Journal</Link>
      </div>
    </section>
  );
}
