'use client';

import React from 'react';

import type { BoardCardVM } from '@/src/core/today/boardViewModel';

type LiveOddsBadgeProps = {
  consensus?: number | string;
  live_odds?: BoardCardVM['live_odds'];
  best_odds?: BoardCardVM['best_odds'];
};

export function LiveOddsBadge({ consensus, live_odds, best_odds }: LiveOddsBadgeProps) {
  if (live_odds && live_odds.length > 0) {
    return (
      <div className="flex flex-wrap gap-1 text-xs text-slate-200" aria-label="live-odds-badges">
        {live_odds.slice(0, 3).map((odds) => {
          const isBest = best_odds?.book === odds.book && String(best_odds.odds) === String(odds.odds);
          return (
            <span
              key={`${odds.book}-${odds.odds}`}
              className={`rounded border px-2 py-0.5 ${isBest ? 'border-cyan-300 font-semibold text-cyan-100' : 'border-slate-600 text-slate-300'}`}
            >
              {odds.book} {odds.odds}
            </span>
          );
        })}
      </div>
    );
  }

  return (
    <span className="rounded border border-slate-600 px-2 py-0.5 text-xs text-slate-300" aria-label="consensus-odds-badge">
      consensus {consensus ?? 'n/a'}
    </span>
  );
}
