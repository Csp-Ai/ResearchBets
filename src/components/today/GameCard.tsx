'use client';

import React from 'react';
import { useState } from 'react';

import type { TodayGame } from '@/src/core/today/types';
import type { SlipBuilderLeg } from '@/features/betslip/SlipBuilder';
import { Chip } from '@/src/components/ui/chip';
import { Button } from '@/src/components/ui/button';

import { PropKeyRow } from './PropKeyRow';

export function GameCard({
  game,
  mode,
  onAdd,
  onAnalyze,
  onOpenScout
}: {
  game: TodayGame;
  mode: 'live' | 'cache' | 'demo';
  onAdd: (leg: SlipBuilderLeg) => void;
  onAnalyze: (leg: SlipBuilderLeg) => void;
  onOpenScout: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-950/75 p-3 sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-base font-semibold">{game.matchup}</p>
          <p className="text-xs text-slate-400">{game.status === 'live' ? 'Live now' : game.startTime} · {game.bookContext}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone={mode === 'demo' ? 'caution' : mode === 'live' ? 'strong' : 'neutral'}>{mode.toUpperCase()}</Chip>
          <Chip className="text-[11px]">{game.league}</Chip>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-slate-500">{game.provenance} · Updated {new Date(game.lastUpdated).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</p>
        <div className="flex gap-2">
          <Button intent="secondary" className="px-2 py-1 text-xs" onClick={onOpenScout}>Open in Scout</Button>
          <Button intent="secondary" className="px-2 py-1 text-xs" onClick={() => setExpanded((value) => !value)}>{expanded ? 'Hide prop keys' : 'Show prop keys'}</Button>
        </div>
      </div>

      {expanded ? (
        <div className="mt-3 grid gap-2">
          {game.propsPreview.map((prop) => (
            <PropKeyRow key={prop.id} prop={prop} onAdd={onAdd} onAnalyze={onAnalyze} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
