import React from 'react';
import { Button } from '@/src/components/ui/button';
import { Chip } from '@/src/components/ui/chip';

import type { LeagueFilter } from './types';

export function TodayHeader({
  leagues,
  activeLeague,
  onLeagueChange,
  onRefresh,
  freshness,
  mode
}: {
  leagues: LeagueFilter[];
  activeLeague: LeagueFilter;
  onLeagueChange: (league: LeagueFilter) => void;
  onRefresh: () => void;
  freshness: string;
  mode: 'live' | 'cache' | 'demo';
}) {
  return (
    <header className="space-y-3 rounded-2xl border border-white/10 bg-slate-950/70 p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Today</h1>
          <p className="text-xs text-slate-400">Live now + upcoming slate with prop keys.</p>
        </div>
        <div className="flex items-center gap-2">
          <Chip tone={mode === 'demo' ? 'caution' : mode === 'live' ? 'strong' : 'neutral'}>{mode === 'demo' ? 'DEMO' : mode.toUpperCase()}</Chip>
          <Button intent="secondary" className="px-3 py-1.5 text-xs" onClick={onRefresh}>Refresh</Button>
        </div>
      </div>
      <p className="text-xs text-slate-500">Freshness: Updated {freshness}</p>
      <div className="flex flex-wrap gap-2">
        {leagues.map((league) => (
          <button
            key={league}
            type="button"
            onClick={() => onLeagueChange(league)}
            className={`rounded-full border px-3 py-1 text-xs ${activeLeague === league ? 'border-cyan-300 bg-cyan-300/20 text-cyan-100' : 'border-white/20 text-slate-300'}`}
          >
            {league}
          </button>
        ))}
      </div>
    </header>
  );
}
