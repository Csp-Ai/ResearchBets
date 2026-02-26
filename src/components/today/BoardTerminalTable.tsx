'use client';

import React from 'react';

import { formatPct, formatSignedPct } from '@/src/core/markets/edgePrimitives';
import type { MarketType } from '@/src/core/markets/marketType';

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

export function BoardTerminalTable({
  rows,
  onToggleLeg,
  selectedLegIds,
  highlightedRowId
}: {
  rows: TerminalBoardRow[];
  onToggleLeg: (row: TerminalBoardRow) => void;
  selectedLegIds: Set<string>;
  highlightedRowId?: string;
}) {
  return (
    <>
      <div className="hidden overflow-x-auto rounded-xl border border-white/10 bg-slate-950/80 lg:block">
        <table className="min-w-full text-left text-xs">
          <thead className="border-b border-white/10 bg-slate-900/80 text-[11px] uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-3 py-2">Player / Market / Line</th>
              <th className="px-3 py-2">L10</th>
              <th className="px-3 py-2">Market / Model</th>
              <th className="px-3 py-2">Edge</th>
              <th className="px-3 py-2">Risk</th>
              <th className="px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const edge = Number.isFinite(row.edgeDelta) ? row.edgeDelta ?? 0 : 0;
              const isSelected = selectedLegIds.has(row.id);
              const isHighlighted = highlightedRowId === row.id;

              return (
                <tr
                  key={row.id}
                  id={`board-row-${row.id}`}
                  className={`border-b border-white/5 ${isHighlighted ? 'bg-cyan-500/10' : 'hover:bg-white/5'}`}
                >
                  <td className="px-3 py-2.5">
                    <p className="font-medium text-white">{row.player}</p>
                    <p className="text-slate-400">{MARKET_LABEL[row.market]} · {row.line ?? 'TBD'} {row.odds ?? ''}</p>
                    <p className="text-[11px] text-slate-500">{row.matchup} · {row.startTime}</p>
                  </td>
                  <td className="px-3 py-2.5 text-slate-200">{row.hitRateL10 ?? 0}%</td>
                  <td className="px-3 py-2.5 text-slate-200">{formatPct(row.marketImpliedProb ?? 0.5)} / {formatPct(row.modelProb ?? 0.5)}</td>
                  <td className="px-3 py-2.5">
                    <p className="text-lg font-bold text-cyan-200">{formatSignedPct(edge)}</p>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">Model − Market</p>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`rounded border px-2 py-0.5 text-[11px] ${row.riskTag === 'stable' ? 'border-emerald-400/40 text-emerald-200' : 'border-amber-400/40 text-amber-200'}`}>
                      {(row.riskTag ?? 'watch').toUpperCase()}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <button
                      type="button"
                      onClick={() => onToggleLeg(row)}
                      className={`rounded border px-2 py-1 text-[11px] ${isSelected ? 'border-rose-400/60 text-rose-200' : 'border-cyan-400/60 text-cyan-100'}`}
                    >
                      {isSelected ? '− Remove' : '+ Add'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid gap-2 lg:hidden">
        {rows.map((row) => {
          const edge = Number.isFinite(row.edgeDelta) ? row.edgeDelta ?? 0 : 0;
          const isSelected = selectedLegIds.has(row.id);
          const isHighlighted = highlightedRowId === row.id;

          return (
            <article key={row.id} id={`board-row-${row.id}`} className={`rounded-lg border border-white/10 bg-slate-950/75 p-2.5 ${isHighlighted ? 'ring-1 ring-cyan-400/60' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{row.player}</p>
                  <p className="text-xs text-slate-300">{MARKET_LABEL[row.market]} · {row.line ?? 'TBD'} {row.odds ?? ''}</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-cyan-200">{formatSignedPct(edge)}</p>
                  <p className="text-[10px] text-slate-400">Model − Market</p>
                </div>
              </div>
              <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                <span>L10 {row.hitRateL10 ?? 0}% · {row.startTime}</span>
                <button
                  type="button"
                  onClick={() => onToggleLeg(row)}
                  className={`rounded border px-2 py-1 ${isSelected ? 'border-rose-400/60 text-rose-200' : 'border-cyan-400/60 text-cyan-100'}`}
                >
                  {isSelected ? 'Remove' : '+ Add'}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
