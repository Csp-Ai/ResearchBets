'use client';

import React from 'react';
import Link from 'next/link';

import type { SlipBuilderLeg } from '@/features/betslip/SlipBuilder';
import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';
import { appendQuery } from '@/src/components/landing/navigation';
import { deriveSlipRiskSummary } from '@/src/core/slips/slipRiskSummary';
import { Badge } from '@/src/components/ui/Badge';
import { CardSurface } from '@/src/components/ui/CardSurface';

export function SlipDrawer({ legs, onRemove, onRunStressTest }: {
  legs: SlipBuilderLeg[];
  onRemove: (id: string) => void;
  onRunStressTest: () => void;
}) {
  const nervous = useNervousSystem();
  const risk = deriveSlipRiskSummary(legs.map((leg) => ({
    id: leg.id,
    player: leg.player,
    selection: `${leg.player} ${leg.marketType} ${leg.line} ${leg.odds ?? ''}`.trim(),
    market: leg.marketType,
    line: leg.line,
    odds: leg.odds,
    game: leg.game
  })));

  return (
    <aside className="lg:sticky lg:top-4 lg:h-fit" data-testid="slip-drawer">
      <CardSurface className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-100">Quick Ticket</h3>
          <span className="mono-number text-xs text-slate-400">{legs.length} legs</span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-md border border-white/10 bg-slate-900/60 p-2"><p className="text-slate-500">Ticket count</p><p className="mono-number text-sm font-semibold text-cyan-100">{legs.length}</p></div>
          <div className="rounded-md border border-white/10 bg-slate-900/60 p-2"><p className="text-slate-500">Stake</p><p className="mono-number text-sm font-semibold text-slate-100">--</p></div>
          <div className="rounded-md border border-white/10 bg-slate-900/60 p-2"><p className="text-slate-500">Payout</p><p className="mono-number text-sm font-semibold text-slate-100">--</p></div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <Badge variant={risk.correlationFlag ? 'warning' : 'success'}>{risk.correlationFlag ? 'HIGH CORR' : 'BALANCED'}</Badge>
          <span className="text-slate-400">Conf {risk.confidencePct}% · Fragility {risk.fragilityScore}</span>
        </div>

        {legs.length >= 2 ? <p className="truncate text-xs text-amber-100">Weakest preview: {risk.weakestLeg}</p> : null}

        {legs.length === 0 ? (
          <div className="rounded-lg bg-black/20 p-3 text-xs text-slate-300">
            <p>Add legs from the board to stage a ticket.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <a href="#board-terminal" className="text-cyan-200 underline">Browse board</a>
              <Link href={appendQuery(nervous.toHref('/slip'), { sample: '1' })} className="text-cyan-200 underline">Sample slip</Link>
            </div>
          </div>
        ) : (
          <ul className="space-y-2">
            {legs.map((leg) => (
              <li key={leg.id} className="rounded-md border border-white/10 bg-slate-950/55 p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-100">{leg.player}</p>
                  <button type="button" onClick={() => onRemove(leg.id)} className="text-xs text-rose-200">Remove</button>
                </div>
                <p className="text-xs text-slate-300">{leg.marketType.toUpperCase()} {leg.line}</p>
                <p className="mono-number text-xs text-slate-400">{leg.odds ?? '—'}</p>
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          disabled={legs.length === 0}
          onClick={onRunStressTest}
          className="terminal-focus w-full rounded-md bg-[#00E5C8] px-4 py-3 text-sm font-bold text-slate-950 transition hover:brightness-110 disabled:opacity-40"
        >
          <span className="inline-flex items-center gap-1">Analyze slip →</span>
        </button>
        <Link href={nervous.toHref('/track')} className="terminal-focus block w-full rounded-md border border-white/20 px-4 py-2.5 text-center text-sm font-semibold text-slate-200 transition hover:border-cyan-300/45 hover:text-cyan-100">Track</Link>
      </CardSurface>
    </aside>
  );
}
