'use client';

import type { SlipBuilderLeg } from '@/features/betslip/SlipBuilder';
import { combineDisplayedParlayOdds, parseAmericanOdds } from '@/src/core/slipMath/displayedParlayOdds';
import { Badge } from '@/src/components/ui/Badge';

export function SlipOptimizerPanel({ legs }: { legs: SlipBuilderLeg[] }) {
  if (legs.length === 0) return null;

  const combined = combineDisplayedParlayOdds(legs.map((leg) => leg.odds));
  const inBand = combined.american >= 600 && combined.american <= 1500;

  return (
    <details className="rounded-xl border border-white/[0.07] bg-white/[0.015] p-3" data-testid="slip-optimizer-panel">
      <summary className="cursor-pointer list-none text-xs font-semibold text-slate-300">
        Payout structure <span className="font-normal text-slate-500">· optional</span>
      </summary>
      <div className="mt-3 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-slate-300">Displayed combined odds <span className="mono-number font-semibold text-slate-100" data-testid="combined-odds">{combined.american >= 0 ? `+${combined.american}` : combined.american}</span></p>
          <Badge variant={inBand ? 'success' : 'warning'}>Reference band +600 to +1500</Badge>
        </div>
        <p className="text-[11px] leading-5 text-slate-500">
          Payout shape is secondary to ticket risk. Use this only after the ticket thesis and Threshold Advisor are clear.
        </p>
        <ul className="space-y-1 text-xs text-slate-400">
          {legs.map((leg) => {
            const odds = parseAmericanOdds(leg.odds);
            const role = odds !== null && odds >= -130 && odds <= -100 ? 'anchor' : 'booster';
            const blocked = leg.deadLegRisk === 'high';
            return (
              <li key={leg.id} className="flex items-center justify-between gap-2 border-t border-white/[0.06] py-2 first:border-t-0">
                <span className="truncate">{leg.player}</span>
                <span className="shrink-0 text-slate-500">{role} · {odds !== null ? (odds > 0 ? `+${odds}` : `${odds}`) : 'n/a'}{blocked ? ' · blocked' : ''}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </details>
  );
}
