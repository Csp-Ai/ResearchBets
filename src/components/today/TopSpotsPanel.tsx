import React from 'react';

import { formatSignedPct } from '@/src/core/markets/edgePrimitives';
import type { TodayPropKey } from '@/src/core/today/types';

export function TopSpotsPanel({ scouts, onSelect }: { scouts: TodayPropKey[]; onSelect?: (id: string) => void }) {
  if (scouts.length === 0) return null;

  return (
    <section className="space-y-2" data-testid="top-spots-panel">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold sm:text-lg">Fast edge checks</h2>
        <p className="text-xs text-slate-400">{scouts.length} board cues</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {scouts.map((scout) => (
          <button key={scout.id} type="button" onClick={() => onSelect?.(scout.id)} className="rounded-xl border border-white/10 bg-slate-950/40 p-3 text-left hover:border-cyan-400/40">
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium text-slate-100">{scout.player} {scout.market} {scout.line}</p>
              <p className="text-base font-bold text-cyan-200">{formatSignedPct(scout.edgeDelta ?? 0)}</p>
            </div>
            <p className="mt-1 text-xs text-slate-400">L10 {scout.hitRateL10 ?? 0}% · {(scout.riskTag ?? 'watch') === 'stable' ? 'Steadier setup' : 'Higher swing setup'}</p>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-slate-300">
              {scout.rationale.slice(0, 2).map((reason) => <li key={reason}>{reason}</li>)}
            </ul>
          </button>
        ))}
      </div>
    </section>
  );
}
