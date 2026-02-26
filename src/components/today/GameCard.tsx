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
    <section className="rounded-xl border border-white/10 bg-slate-950/75 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold sm:text-base">{game.matchup}</p>
          <p className="text-xs text-slate-400">{game.status === 'live' ? 'Live now' : game.startTime} · {game.bookContext}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Chip className="text-[11px]">{game.league}</Chip>
          <Chip tone={mode === 'demo' ? 'caution' : mode === 'live' ? 'strong' : 'neutral'} className="text-[11px]">{mode.toUpperCase()}</Chip>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <p className="text-[11px] text-slate-500">Updated {new Date(game.lastUpdated).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</p>
        <span className="rounded-md border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-300">
          Provenance: {game.provenance}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button intent="primary" className="px-2.5 py-1 text-xs" onClick={onOpenScout}>Open Scout</Button>
        <Button intent="secondary" className="px-2.5 py-1 text-xs" onClick={() => setExpanded((value) => !value)}>
          {expanded ? 'Hide prop keys' : 'Prop keys'}
        </Button>
        <p className="text-[11px] text-slate-500">Browse props, then push to slip for analysis.</p>
      </div>

      {expanded ? (
        <div className="mt-3 grid gap-2 border-t border-white/10 pt-3">
          {game.propsPreview.map((prop) => (
            <PropKeyRow key={prop.id} prop={prop} gameId={game.id} onAdd={onAdd} onAnalyze={onAnalyze} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
