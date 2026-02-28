'use client';

import type { EdgeProfile } from '@/src/core/review/edgeProfile';

export function EdgeProfileCard({ profile }: { profile: EdgeProfile }) {
  return (
    <section className="rounded-xl border border-slate-700 bg-slate-900/70 p-4" data-testid="edge-profile-card">
      <h2 className="text-lg font-semibold">Edge Profile</h2>
      <div className="mt-2 grid gap-2 text-sm sm:grid-cols-3">
        <p>Total tickets: {profile.totalTickets}</p>
        <p>Win rate: {(profile.winRate * 100).toFixed(1)}%</p>
        <p>Avg legs: {profile.avgLegCount.toFixed(2)}</p>
        <p>Near-miss rate: {(profile.nearMissRate * 100).toFixed(1)}%</p>
        <p>High fragility share: {(profile.highFragilityShare * 100).toFixed(1)}%</p>
        <p>Coverage gap share: {(profile.coverageGapShare * 100).toFixed(1)}%</p>
      </div>
      <div className="mt-3 text-sm">
        <p className="font-medium">Top miss tags</p>
        <ul className="mt-1 flex flex-wrap gap-2 text-xs">
          {profile.topMissTags.length > 0
            ? profile.topMissTags.map((item) => <li key={item.tag} className="rounded-full border border-white/20 px-2 py-1">{item.tag} · {item.count} ({(item.rate * 100).toFixed(0)}%)</li>)
            : <li className="text-slate-300">No misses logged yet.</li>}
        </ul>
      </div>
      <div className="mt-3 text-sm">
        <p className="font-medium">Common killer stat types</p>
        <ul className="mt-1 flex flex-wrap gap-2 text-xs">
          {profile.killerStatTypes.length > 0
            ? profile.killerStatTypes.map((item) => <li key={item.statType} className="rounded-full border border-white/20 px-2 py-1">{item.statType}: {item.count}</li>)
            : <li className="text-slate-300">No losing stat type trend yet.</li>}
        </ul>
      </div>
    </section>
  );
}
