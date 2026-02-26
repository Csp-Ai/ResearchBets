import React from 'react';

import type { TodayPropKey } from '@/src/core/today/types';

export function TopSpotsPanel({ scouts }: { scouts: TodayPropKey[] }) {
  if (scouts.length === 0) return null;

  return (
    <section className="space-y-2" data-testid="top-spots-panel">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold sm:text-lg">Top spots</h2>
        <p className="text-xs text-slate-400">{scouts.length} signals</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {scouts.map((scout) => (
          <article key={scout.id} className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
            <p className="font-medium text-slate-100">{scout.player} {scout.market} {scout.line}</p>
            <p className="mt-1 text-xs text-slate-400">{scout.odds} • {scout.provenance}</p>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-slate-300">
              {scout.rationale.slice(0, 2).map((reason) => <li key={reason}>{reason}</li>)}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
