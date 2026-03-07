'use client';

import React from 'react';

import { formatSignedPct } from '@/src/core/markets/edgePrimitives';
import type { MarketType } from '@/src/core/markets/marketType';
import { deriveEvidenceTexture } from '@/src/core/today/evidenceTexture';
import { Badge } from '@/src/components/ui/Badge';
import { CardSurface } from '@/src/components/ui/CardSurface';
import { Button } from '@/src/components/ui/button';

export type SortKey = 'edge' | 'l10' | 'risk' | 'start';

export type TerminalBoardRow = {
  id: string;
  gameId: string;
  matchup: string;
  startTime: string;
  player: string;
  market: MarketType;
  line?: string;
  odds?: string;
  hitRateL10?: number;
  marketImpliedProb?: number;
  modelProb?: number;
  edgeDelta?: number;
  riskTag?: 'stable' | 'watch';
  l5Avg?: number;
  threesAttL5Avg?: number;
  l5Source?: 'live' | 'cached' | 'demo' | 'heuristic';
  minutesL1?: number;
  minutesL3Avg?: number;
  minutesSource?: 'live' | 'cached' | 'demo' | 'heuristic';
  attemptsSource?: 'live' | 'cached' | 'demo' | 'heuristic';
  roleConfidence?: 'high' | 'med' | 'low';
  roleReasons?: string[];
  deadLegRisk?: 'low' | 'med' | 'high';
  deadLegReasons?: string[];
  rationale?: string[];
};

const MARKET_LABEL: Record<MarketType, string> = {
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

const riskWeight: Record<'stable' | 'watch', number> = {
  stable: 0,
  watch: 1
};

function toDecisionTier(row: TerminalBoardRow): { label: string; variant: 'success' | 'warning' | 'neutral'; cue: string } {
  const edge = row.edgeDelta ?? 0;
  const riskPenalty = row.riskTag === 'stable' ? 0 : 0.015;
  const net = edge - riskPenalty;
  if (net >= 0.07) return { label: 'Priority look', variant: 'success', cue: 'Multiple supports aligned' };
  if (net >= 0.03) return { label: 'Viable look', variant: 'neutral', cue: 'One clear support with manageable risk' };
  return { label: 'Thin look', variant: 'warning', cue: 'Support is narrow; fragility can break the edge' };
}

const SUPPORT_LABEL: Record<ReturnType<typeof deriveEvidenceTexture>['supportTags'][number], string> = {
  'volume-driven': 'Volume-driven',
  'role-driven': 'Role-driven',
  'matchup-driven': 'Matchup-driven',
  'trend-driven': 'Trend-driven',
  'price-driven': 'Price-driven',
};

export function sortBoardRows(rows: TerminalBoardRow[], sortKey: SortKey): TerminalBoardRow[] {
  return [...rows].sort((a, b) => {
    if (sortKey === 'l10') return (b.hitRateL10 ?? 0) - (a.hitRateL10 ?? 0);
    if (sortKey === 'risk') return riskWeight[a.riskTag ?? 'watch'] - riskWeight[b.riskTag ?? 'watch'];
    if (sortKey === 'start') return a.startTime.localeCompare(b.startTime);
    return (b.edgeDelta ?? 0) - (a.edgeDelta ?? 0);
  });
}

export function BoardTerminalTable({ rows, onToggleLeg, selectedLegIds, highlightedRowId, recentAddedRowId }: {
  rows: TerminalBoardRow[];
  onToggleLeg: (row: TerminalBoardRow) => void;
  selectedLegIds: Set<string>;
  highlightedRowId?: string;
  recentAddedRowId?: string | null;
}) {
  return (
    <div className="space-y-2">
      {rows.map((row, index) => {
        const isSelected = selectedLegIds.has(row.id);
        const signal = row.riskTag === 'stable' ? 'Steadier setup' : 'Higher swing setup';
        const tier = toDecisionTier(row);
        const evidence = deriveEvidenceTexture(row);

        return (
          <CardSurface key={row.id} id={`board-row-${row.id}`} className={`p-2.5 transition-all hover-glow ${highlightedRowId === row.id ? 'ring-1 ring-cyan-300/65' : ''} ${isSelected ? 'border-cyan-300/45 bg-cyan-500/[0.08]' : ''} ${recentAddedRowId === row.id ? 'ring-1 ring-emerald-300/70 shadow-[0_0_0_1px_rgba(110,231,183,0.4)]' : ''}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 space-y-1">
                <p className="truncate text-sm font-semibold text-slate-100">{row.player} · {MARKET_LABEL[row.market]} {row.line ?? 'TBD'}</p>
                <p className="truncate text-xs text-slate-400">#{index + 1} ranked · {row.matchup} · <span className="mono-number">{row.odds ?? 'Odds TBD'}</span> · Edge <span className="mono-number">{formatSignedPct(row.edgeDelta ?? 0)}</span></p>
                <p className="truncate text-xs text-slate-300">{row.rationale?.[0] ?? signal}</p>
                {evidence.strongestEvidence ? <p className="truncate text-[11px] text-slate-300">Support cue: {evidence.strongestEvidence}</p> : null}
                {evidence.caution ? <p className="truncate text-[11px] text-amber-100">Watch-out: {evidence.caution}</p> : null}
                <p className="truncate text-[11px] text-slate-400">{tier.label} · {tier.cue}</p>
                <div className="flex flex-wrap gap-1 text-[11px]">
                  {evidence.supportTags.map((tag) => <Badge key={tag} variant="neutral" size="sm">{SUPPORT_LABEL[tag]}</Badge>)}
                  {typeof row.l5Avg === 'number' ? <Badge variant="neutral" size="sm">L5 {row.l5Avg.toFixed(1)}</Badge> : null}
                  {typeof row.minutesL3Avg === 'number' ? <Badge variant="neutral" size="sm">MIN L3 {row.minutesL3Avg.toFixed(1)}</Badge> : null}
                  {typeof row.threesAttL5Avg === 'number' && row.market === 'threes' ? <Badge variant="neutral" size="sm">3PA L5 {row.threesAttL5Avg.toFixed(1)}</Badge> : null}
                  {row.deadLegRisk ? <Badge variant={row.deadLegRisk === 'high' ? 'danger' : row.deadLegRisk === 'med' ? 'warning' : 'success'} size="sm">Risk {row.deadLegRisk}</Badge> : null}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={tier.variant} className="justify-center">{tier.label}</Badge>
                <Button
                  intent={isSelected ? 'secondary' : 'primary'}
                  onClick={() => onToggleLeg(row)}
                  className="min-h-0 px-3 py-1.5 text-xs"
                >
                  {isSelected ? 'Remove' : 'Add'}
                </Button>
              </div>
            </div>
          </CardSurface>
        );
      })}
    </div>
  );
}
