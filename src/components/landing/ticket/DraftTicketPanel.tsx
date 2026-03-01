'use client';

import type { SlipBuilderLeg } from '@/features/betslip/SlipBuilder';
import type { StressResult } from '@/src/components/landing/stressTest';

type Props = {
  slip: SlipBuilderLeg[];
  onRemoveLeg: (id: string) => void;
  onRunStress: () => void;
  stress: StressResult | null;
  running: boolean;
  onSave: () => void;
};

export function DraftTicketPanel({ slip, onRemoveLeg, onRunStress, stress, running, onSave }: Props) {
  return (
    <aside className="rounded-xl border border-white/10 bg-slate-900/50 p-3">
      <h2 className="mb-2 text-sm font-semibold text-slate-100">Draft Ticket</h2>
      <div className="space-y-2">
        {slip.length === 0 ? <p className="text-xs text-slate-400">Add legs from the board to begin.</p> : null}
        {slip.map((leg) => (
          <div key={leg.id} className="flex items-center justify-between rounded-md border border-white/10 px-2 py-2 text-xs text-slate-200">
            <span>{leg.player} {leg.line} {leg.marketType.toUpperCase()}</span>
            <button className="min-h-11 rounded px-2 text-slate-300" aria-label={`Remove ${leg.player}`} onClick={() => onRemoveLeg(leg.id)}>Remove</button>
          </div>
        ))}
      </div>
      <button onClick={onRunStress} disabled={slip.length < 2 || running} className="mt-3 min-h-11 w-full rounded-md bg-cyan-300 px-3 text-sm font-semibold text-slate-950 disabled:opacity-60">{running ? 'Analyzing…' : 'Run Stress Test'}</button>
      {stress ? (
        <div className="mt-3 space-y-1 rounded-md border border-cyan-400/30 bg-cyan-400/10 p-2 text-xs text-slate-100">
          <p>Weakest leg: <strong>{stress.weakestLegLabel}</strong></p>
          <p>Correlation pressure: {stress.correlationPressure}</p>
          <p>Fragility: {stress.fragility}</p>
          <p>{stress.reason}</p>
          {stress.marketDeviation ? <p>Market deviation: {stress.marketDeviation}</p> : null}
          <button onClick={onSave} className="mt-2 min-h-11 rounded border border-white/20 px-2">Save analysis</button>
        </div>
      ) : null}
    </aside>
  );
}
