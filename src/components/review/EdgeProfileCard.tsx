'use client';

import type { EdgeProfile } from '@/src/core/review/edgeProfile';
import { CardSurface } from '@/src/components/ui/CardSurface';
import { Badge } from '@/src/components/ui/Badge';

export function EdgeProfileCard({ profile }: { profile: EdgeProfile }) {
  const topLeak = profile.topMissTags[0]?.tag ?? 'none';
  const killerType = profile.killerStatTypes[0]?.statType ?? 'none';

  return (
    <CardSurface className="p-4" data-testid="edge-profile-card">
      <h2 className="text-lg font-semibold text-slate-100">Edge Profile</h2>
      <p className="panel-subtitle mt-1">Quick scan of recent ticket quality.</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div className="row-shell"><p className="text-xs text-slate-400">Win rate</p><p className="mono-number text-2xl font-bold text-slate-100">{(profile.winRate * 100).toFixed(1)}%</p><Badge size="sm" variant="success">Stable</Badge></div>
        <div className="row-shell"><p className="text-xs text-slate-400">Near-miss</p><p className="mono-number text-2xl font-bold text-amber-100">{(profile.nearMissRate * 100).toFixed(1)}%</p><Badge size="sm" variant="warning">Watch</Badge></div>
        <div className="row-shell"><p className="text-xs text-slate-400">Top leak</p><p className="text-base font-semibold text-rose-100">{topLeak}</p><Badge size="sm" variant="danger">Top miss</Badge></div>
        <div className="row-shell"><p className="text-xs text-slate-400">Killer stat type</p><p className="text-base font-semibold text-cyan-100">{killerType}</p><Badge size="sm" variant="info">Stat type</Badge></div>
      </div>
    </CardSurface>
  );
}
