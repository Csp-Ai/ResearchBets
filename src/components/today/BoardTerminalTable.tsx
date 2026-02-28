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

        return (
          <CardSurface key={row.id} id={`board-row-${row.id}`} className={`p-3 transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(0,229,200,0.12)] ${highlightedRowId === row.id ? 'ring-cyan-300/55' : ''}`}>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-base font-bold text-slate-100">{row.player}</p>
                <p className="text-sm text-slate-300">{MARKET_LABEL[row.market]} {row.line ?? 'TBD'} {row.odds ?? ''}</p>
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant={confidenceVariant}>CONF {confidence}%</Badge>
                  <span className="text-xs text-slate-500">{formatSignedPct(row.edgeDelta ?? 0)}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onToggleLeg(row)}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition duration-300 ${isSelected ? 'bg-rose-500/15 text-rose-100' : 'bg-cyan-400/20 text-cyan-100 hover:shadow-[0_0_22px_rgba(0,229,200,0.35)]'}`}
              >
                {isSelected ? 'Added' : '+ Add'}
              </button>
            </div>
          </CardSurface>
        );
      })}
    </div>
  );
}
