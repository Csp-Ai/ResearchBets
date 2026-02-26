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
  onOpenScout,
  dense = false
}: {
  title: string;
  games: TodayGame[];
  mode: TodayMode;
  onAdd: (leg: SlipBuilderLeg) => void;
  onAnalyze: (leg: SlipBuilderLeg) => void;
  onOpenScout: () => void;
  dense?: boolean;
}) {
  if (games.length === 0) return null;

  return (
    <section className={dense ? 'space-y-2' : 'space-y-3'}>
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold sm:text-lg">{title}</h2>
        <p className="text-xs text-slate-400">{games.length} games</p>
      </div>
      <div className={dense ? 'grid gap-2 sm:grid-cols-2' : 'grid gap-3 sm:grid-cols-2'}>
        {games.map((game) => (
          <div key={game.id} className={games.length === 1 ? 'sm:col-span-2' : ''}>
            <GameCard game={game} mode={mode} onAdd={onAdd} onAnalyze={onAnalyze} onOpenScout={onOpenScout} />
          </div>
        ))}
      </div>
    </section>
  );
}
