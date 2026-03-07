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
import { withTraceId } from '@/src/core/trace/queryTrace';
import { DecisionThreadStrip } from '@/src/components/nervous/DecisionThreadStrip';

export function SlipDrawer({ legs, rationaleByLegId, onRemove, onRunStressTest }: {
  legs: SlipBuilderLeg[];
  rationaleByLegId: Map<string, { boardReason: string; support?: string; watchOut?: string; fragility?: string }>;
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

  const hasLegs = legs.length > 0;
  const traceScopedTrackHref = appendQuery(withTraceId(nervous.toHref('/track'), nervous.trace_id ?? 'trace_demo_track'), hasLegs ? { continuity: 'staged_ticket' } : {});

  return (
    <aside className="lg:sticky lg:top-4 lg:h-fit" data-testid="slip-drawer">
      <CardSurface className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-100">Ticket staging</h3>
          <span className="mono-number text-xs text-slate-400">{legs.length} legs</span>
        </div>

        {hasLegs ? (
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant={risk.correlationFlag ? 'warning' : 'success'}>{risk.correlationFlag ? 'Guardrail active' : 'Correlation in range'}</Badge>
            <Badge variant="neutral">Ticket hit range <span className="ml-1">{risk.confidencePct}%</span></Badge>
            <Badge variant="neutral">Fragility <span className="ml-1">{risk.fragilityScore}</span></Badge>
          </div>
        ) : null}

        {legs.length >= 2 ? <p className="truncate text-xs text-amber-100">Weakest leg preview: {risk.weakestLeg}</p> : null}
        {hasLegs ? <p className="text-[11px] text-slate-400">Staged legs keep board Support, Watch-out, and Fragility context into analysis.</p> : null}

        {hasLegs ? (
          <DecisionThreadStrip
            activeStage="staging"
            contextLabel="Staged from Board — Support and Watch-out carry into Analyze, then Track continues the same run."
          />
        ) : null}


        {!hasLegs ? (
          <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-xs text-slate-300">
            <p className="font-semibold text-slate-200">No ticket staged yet.</p>
            <p className="mt-1">Start on the board: add 2–3 legs with support cues, then analyze.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <a href="#board-terminal" className="text-cyan-200 underline">Browse board</a>
              <Link href={nervous.toHref('/slip', { sample: '1' })} className="text-cyan-200 underline">Load sample ticket</Link>
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
                    <p className="text-[11px] text-slate-300">Board reason: {rationaleByLegId.get(leg.id)?.boardReason ?? 'No explicit rationale; staged from ranked board signal.'}</p>
                    {rationaleByLegId.get(leg.id)?.support ? <p className="text-[11px] text-emerald-100">Support: {rationaleByLegId.get(leg.id)?.support}</p> : null}
                    {rationaleByLegId.get(leg.id)?.watchOut ? <p className="text-[11px] text-amber-100">Watch-out: {rationaleByLegId.get(leg.id)?.watchOut}</p> : null}
                    {rationaleByLegId.get(leg.id)?.fragility ? <p className="text-[11px] text-slate-400">{rationaleByLegId.get(leg.id)?.fragility}</p> : null}
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
            disabled={!hasLegs}
            onClick={onRunStressTest}
            className="w-full text-sm font-semibold"
          >
            Analyze staged ticket
          </Button>
          <Link
            href={traceScopedTrackHref}
            aria-disabled={!hasLegs}
            className={`ui-button ui-button-secondary terminal-focus w-full text-center text-sm font-semibold ${!hasLegs ? 'pointer-events-none opacity-50' : ''}`}
          >
            Track this run
          </Link>
        </div>
      </CardSurface>
    </aside>
  );
}
