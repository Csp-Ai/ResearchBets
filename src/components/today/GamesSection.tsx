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
    <section className="space-y-2.5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-xs text-slate-400">{games.length} games</p>
      </div>
      <div className="grid gap-2.5">
        {games.map((game) => (
          <GameCard key={game.id} game={game} mode={mode} onAdd={onAdd} onAnalyze={onAnalyze} onOpenScout={onOpenScout} />
        ))}
        {games.length === 0 ? <p className="rounded-xl border border-dashed border-white/15 p-4 text-sm text-slate-400">No games for this filter.</p> : null}
      </div>
    </section>
  );
}
