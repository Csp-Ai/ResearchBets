'use client';

import React from 'react';
import type { TodayPropKey } from '@/src/core/today/types';
import type { SlipBuilderLeg } from '@/features/betslip/SlipBuilder';
import { Button } from '@/src/components/ui/button';
import { Chip } from '@/src/components/ui/chip';

const marketLabel: Record<TodayPropKey['market'], string> = {
  spread: 'Spread',
  total: 'Total',
  moneyline: 'Moneyline',
  points: 'Points',
  threes: 'Threes',
  rebounds: 'Rebounds',
  assists: 'Assists',
  ra: 'RA',
  pra: 'PRA'
};

export function PropKeyRow({
  prop,
  onAdd,
  onAnalyze
}: {
  prop: TodayPropKey;
  onAdd: (leg: SlipBuilderLeg) => void;
  onAnalyze: (leg: SlipBuilderLeg) => void;
}) {
  const leg: SlipBuilderLeg = {
    id: prop.id,
    player: prop.player,
    marketType: prop.market,
    line: prop.line ?? 'TBD',
    odds: prop.odds
  };

  return (
    <article className="rounded-xl border border-white/10 bg-slate-950/55 p-2.5">
      <div className="flex flex-wrap items-center justify-between gap-1.5">
        <p className="text-sm font-medium text-white">{prop.player} · {marketLabel[prop.market]}</p>
        <p className="text-xs text-slate-300">{prop.line ?? 'Line tbd'} {prop.odds ? `(${prop.odds})` : ''}</p>
      </div>
      <ul className="mt-1 list-disc pl-4 text-xs text-slate-300">
        {prop.rationale.slice(0, 2).map((bullet) => <li key={`${prop.id}:${bullet}`}>{bullet}</li>)}
      </ul>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Chip className="text-[11px]">{prop.provenance}</Chip>
        <p className="text-[11px] text-slate-500">Updated {new Date(prop.lastUpdated).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</p>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button intent="secondary" className="px-2.5 py-1.5 text-xs" onClick={() => onAdd(leg)}>Add to draft slip</Button>
        <Button intent="primary" className="px-2.5 py-1.5 text-xs" onClick={() => onAnalyze(leg)}>Analyze</Button>
      </div>
    </article>
  );
}
