'use client';

import React from 'react';

import { formatSignedPct } from '@/src/core/markets/edgePrimitives';
import type { MarketType } from '@/src/core/markets/marketType';
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

export function sortBoardRows(rows: TerminalBoardRow[], sortKey: SortKey): TerminalBoardRow[] {
  return [...rows].sort((a, b) => {
    if (sortKey === 'l10') return (b.hitRateL10 ?? 0) - (a.hitRateL10 ?? 0);
    if (sortKey === 'risk') return riskWeight[a.riskTag ?? 'watch'] - riskWeight[b.riskTag ?? 'watch'];
    if (sortKey === 'start') return a.startTime.localeCompare(b.startTime);
    return (b.edgeDelta ?? 0) - (a.edgeDelta ?? 0);
  });
}

export function BoardTerminalTable({ rows, onToggleLeg, selectedLegIds, highlightedRowId }: {
  rows: TerminalBoardRow[];
  onToggleLeg: (row: TerminalBoardRow) => void;
  selectedLegIds: Set<string>;
  highlightedRowId?: string;
}) {
  return (
    <div className="space-y-2">
      {rows.map((row) => {
        const isSelected = selectedLegIds.has(row.id);
        const confidence = Math.max(0, Math.min(100, Math.round(((row.modelProb ?? 0.5) - (row.marketImpliedProb ?? 0.5) + 0.5) * 100)));
        const confidenceVariant = confidence >= 62 ? 'success' : confidence >= 52 ? 'warning' : 'neutral';
        const signal = confidence >= 62 ? 'stable' : 'watch';

        return (
          <CardSurface key={row.id} id={`board-row-${row.id}`} className={`p-3 transition-all hover-glow ${highlightedRowId === row.id ? 'ring-1 ring-cyan-300/65' : ''} ${isSelected ? 'border-cyan-300/45 bg-cyan-500/[0.08]' : ''}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <p className="truncate text-sm font-semibold text-slate-100">{row.player} · {MARKET_LABEL[row.market]} {row.line ?? 'TBD'}</p>
                <p className="truncate text-xs text-slate-400">{row.matchup} · <span className="mono-number">{row.odds ?? 'Odds TBD'}</span> · <span className="mono-number">{formatSignedPct(row.edgeDelta ?? 0)}</span></p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={confidenceVariant} className="justify-center">{confidence}% {signal}</Badge>
                <Button
                  intent={isSelected ? 'secondary' : 'primary'}
                  onClick={() => onToggleLeg(row)}
                  className="min-h-0 px-3 py-1.5 text-xs"
                >
                  {isSelected ? 'Added' : '+ Add'}
                </Button>
              </div>
            </div>
          </CardSurface>
        );
      })}
    </div>
  );
}
