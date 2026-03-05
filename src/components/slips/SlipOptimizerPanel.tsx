'use client';

import type { SlipBuilderLeg } from '@/features/betslip/SlipBuilder';
import { combineDisplayedParlayOdds, parseAmericanOdds } from '@/src/core/slipMath/displayedParlayOdds';
import { CardSurface } from '@/src/components/ui/CardSurface';
import { Badge } from '@/src/components/ui/Badge';

export function SlipOptimizerPanel({ legs }: { legs: SlipBuilderLeg[] }) {
  const combined = combineDisplayedParlayOdds(legs.map((leg) => leg.odds));
  const inBand = combined.american >= 600 && combined.american <= 1500;

  return (
    <CardSurface className="space-y-3 p-4" data-testid="slip-optimizer-panel">
      <h3 className="text-lg font-semibold text-slate-100">Slip optimizer</h3>
      <p className="text-sm text-slate-300">Displayed odds <span className="mono-number" data-testid="combined-odds">{combined.american >= 0 ? `+${combined.american}` : combined.american}</span></p>
      <Badge variant={inBand ? 'success' : 'warning'}>Target band +600 to +1500</Badge>
      <ul className="space-y-1 text-xs text-slate-300">
        {legs.map((leg) => {
          const odds = parseAmericanOdds(leg.odds);
          const role = odds !== null && odds >= -130 && odds <= -100 ? 'anchor' : 'booster';
          const delta = odds === null ? 0 : combineDisplayedParlayOdds([odds]).american;
          const blocked = leg.deadLegRisk === 'high';
          return <li key={leg.id} className="row-shell">{leg.player} · {role} · {odds !== null ? (odds > 0 ? `+${odds}` : `${odds}`) : 'n/a'} · Δ {delta > 0 ? `+${delta}` : delta}{blocked ? ' · blocked (dead-leg HIGH)' : ''}</li>;
        })}
      </ul>
    </CardSurface>
  );
}
