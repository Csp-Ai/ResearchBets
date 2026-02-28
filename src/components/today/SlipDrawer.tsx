'use client';

import React from 'react';
import Link from 'next/link';

import type { SlipBuilderLeg } from '@/features/betslip/SlipBuilder';
import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';
import { appendQuery } from '@/src/components/landing/navigation';
import { deriveSlipRiskSummary } from '@/src/core/slips/slipRiskSummary';
import { Badge } from '@/src/components/ui/Badge';
import { CardSurface } from '@/src/components/ui/CardSurface';
import { Button } from '@/src/components/ui/button';

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
          <h3 className="text-lg font-semibold text-slate-100">Bet Ticket</h3>
          <span className="mono-number text-xs text-slate-400">{legs.length} legs</span>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant={risk.correlationFlag ? 'warning' : 'success'}>{risk.correlationFlag ? 'Guardrail active' : 'Correlation in range'}</Badge>
          <Badge variant="neutral">Hit est <span className="ml-1">{risk.confidencePct}%</span></Badge>
          <Badge variant="neutral">Fragility <span className="ml-1">{risk.fragilityScore}</span></Badge>
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
              <li key={leg.id} className="row-shell">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-100">{leg.player}</p>
                    <p className="text-xs text-slate-300">{leg.marketType.toUpperCase()} {leg.line} <span className="mono-number">{leg.odds ?? '—'}</span></p>
                  </div>
                  <button type="button" onClick={() => onRemove(leg.id)} className="terminal-focus text-xs text-rose-200">Remove</button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
          <Button
            type="button"
            intent="primary"
            disabled={legs.length === 0}
            onClick={onRunStressTest}
            className="w-full text-sm font-semibold"
          >
            Analyze slip
          </Button>
          <Link href={nervous.toHref('/track')} className="ui-button ui-button-secondary terminal-focus w-full text-center text-sm font-semibold">Track ticket</Link>
        </div>
      </CardSurface>
    </aside>
  );
}
