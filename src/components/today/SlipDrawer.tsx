'use client';

import React from 'react';

import type { SlipBuilderLeg } from '@/features/betslip/SlipBuilder';

const riskLevelScore: Record<'stable' | 'watch', number> = {
  stable: 1,
  watch: 2
};

function aggregateRisk(legs: SlipBuilderLeg[]): string {
  if (legs.length === 0) return 'No risk';
  const score = legs.reduce((sum, leg) => sum + riskLevelScore[leg.volatility === 'low' ? 'stable' : 'watch'], 0);
  if (score <= legs.length + 1) return 'Low';
  if (score <= legs.length * 1.8) return 'Medium';
  return 'Elevated';
}

export function SlipDrawer({
  legs,
  onRemove,
  onRunStressTest
}: {
  legs: SlipBuilderLeg[];
  onRemove: (id: string) => void;
  onRunStressTest: () => void;
}) {
  return (
    <aside className="rounded-xl border border-white/10 bg-slate-950/80 p-3 lg:sticky lg:top-4 lg:h-fit" data-testid="slip-drawer">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Slip Drawer</h3>
        <span className="text-xs text-slate-400">{legs.length} legs</span>
      </div>
      <p className="mt-1 text-xs text-slate-400">Expected risk: <span className="font-medium text-slate-200">{aggregateRisk(legs)}</span></p>
      <ul className="mt-2 space-y-1.5">
        {legs.map((leg) => (
          <li key={leg.id} className="rounded border border-white/10 bg-slate-900/60 px-2 py-1.5 text-xs">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-slate-100">{leg.player} · {leg.marketType} {leg.line}</p>
              <button type="button" onClick={() => onRemove(leg.id)} className="text-[11px] text-rose-200">Remove</button>
            </div>
          </li>
        ))}
      </ul>
      <button
        type="button"
        disabled={legs.length === 0}
        onClick={onRunStressTest}
        className="mt-3 w-full rounded border border-cyan-400/70 bg-cyan-500/20 px-3 py-2 text-xs font-semibold text-cyan-100 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Run Stress Test
      </button>
    </aside>
  );
}
