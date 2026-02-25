import React from 'react';
import type { TodayGame, TodayMode } from '@/src/core/today/types';
import type { SlipBuilderLeg } from '@/features/betslip/SlipBuilder';

import { GameCard } from './GameCard';

export function GamesSection({
  title,
  games,
  mode,
  onAdd,
  onAnalyze,
  onOpenScout
}: {
  title: string;
  games: TodayGame[];
  mode: TodayMode;
  onAdd: (leg: SlipBuilderLeg) => void;
  onAnalyze: (leg: SlipBuilderLeg) => void;
  onOpenScout: () => void;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold sm:text-lg">{title}</h2>
        <p className="text-xs text-slate-400">{games.length} games</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {games.map((game) => (
          <GameCard key={game.id} game={game} mode={mode} onAdd={onAdd} onAnalyze={onAnalyze} onOpenScout={onOpenScout} />
        ))}
        {games.length === 0 ? <p className="sm:col-span-2 rounded-xl border border-dashed border-white/15 p-6 text-center text-sm text-slate-400">No games for this filter.</p> : null}
      </div>
    </section>
  );
}
