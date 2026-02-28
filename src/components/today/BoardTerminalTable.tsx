'use client';

import React from 'react';

import { formatSignedPct } from '@/src/core/markets/edgePrimitives';
import type { MarketType } from '@/src/core/markets/marketType';
import { Badge } from '@/src/components/ui/Badge';
import { CardSurface } from '@/src/components/ui/CardSurface';

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
          <CardSurface key={row.id} id={`board-row-${row.id}`} className={`p-3 transition duration-200 hover-glow ${highlightedRowId === row.id ? 'ring-cyan-300/55' : ''} ${isSelected ? 'border-cyan-300/40 bg-cyan-500/[0.07]' : ''}`}>
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="truncate text-[15px] font-semibold text-slate-100">{row.player} · {MARKET_LABEL[row.market]} {row.line ?? 'TBD'}</p>
                <p className="mt-0.5 text-xs text-slate-400">{row.matchup} · {row.odds ?? 'ODDS TBD'}</p>
              </div>
              <div className="hidden min-w-[132px] justify-end md:flex">
                <Badge variant={confidenceVariant} className="mono-number justify-center">{confidence}% • {signal}</Badge>
              </div>
              <button
                type="button"
                onClick={() => onToggleLeg(row)}
                className={`terminal-focus inline-flex items-center gap-1 rounded-md border px-3 py-2 text-xs font-semibold transition ${isSelected ? 'border-cyan-300/60 bg-cyan-400/20 text-cyan-100' : 'border-cyan-300/35 bg-cyan-500/10 text-cyan-100 hover:border-cyan-200/70 hover:bg-cyan-400/20'}`}
              >
                {isSelected ? 'Added' : '+ Add'}
              </button>
            </div>
            <div className="mt-2 flex items-center justify-between md:hidden">
              <Badge variant={confidenceVariant} className="mono-number">{confidence}% • {signal}</Badge>
              <span className="text-xs text-slate-500">{formatSignedPct(row.edgeDelta ?? 0)}</span>
            </div>
          </CardSurface>
        );
      })}
    </div>
  );
}
