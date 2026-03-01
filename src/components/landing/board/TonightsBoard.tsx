'use client';

import type { SlipBuilderLeg } from '@/features/betslip/SlipBuilder';
import type { MarketType } from '@/src/core/markets/marketType';

export type LandingBoardRow = {
  id: string;
  gameId: string;
  matchup: string;
  startTime: string;
  player: string;
  market: MarketType;
  line: string;
  odds: string;
  hitRateL10: number;
  riskTag: 'stable' | 'watch';
};

type Props = {
  rows: LandingBoardRow[];
  query: string;
  onQueryChange: (value: string) => void;
  selectedIds: Set<string>;
  onAddLeg: (row: LandingBoardRow) => void;
  onRemoveLeg: (rowId: string) => void;
};

export function toSlipLeg(row: LandingBoardRow): SlipBuilderLeg {
  return {
    id: row.id,
    player: row.player,
    marketType: row.market,
    line: row.line,
    odds: row.odds,
    game: row.matchup,
    confidence: row.hitRateL10 / 100,
    volatility: row.riskTag === 'watch' ? 'medium' : 'low',
  };
}

export function TonightsBoard({ rows, query, onQueryChange, selectedIds, onAddLeg, onRemoveLeg }: Props) {
  const grouped = rows.reduce<Record<string, LandingBoardRow[]>>((acc, row) => {
    if (!`${row.matchup} ${row.player} ${row.market}`.toLowerCase().includes(query.toLowerCase())) return acc;
    const key = `${row.matchup} • ${row.startTime}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(row);
    return acc;
  }, {});

  return (
    <section id="tonights-board" className="rounded-xl border border-white/10 bg-slate-900/50 p-3" aria-label="Tonight's Board">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-100">Tonight&apos;s Board</h2>
        <input aria-label="Search board" value={query} onChange={(e) => onQueryChange(e.target.value)} className="min-h-11 w-44 rounded-md border border-white/15 bg-slate-950 px-2 text-xs text-slate-100" placeholder="Search player" />
      </div>
      <div className="space-y-3">
        {Object.entries(grouped).map(([group, legs]) => (
          <div key={group}>
            <p className="mb-1 text-[11px] uppercase tracking-wide text-slate-400">{group}</p>
            <div className="space-y-2">
              {legs.map((row) => {
                const added = selectedIds.has(row.id);
                return (
                  <div key={row.id} className={`flex min-h-11 items-center gap-2 rounded-lg border px-3 py-2 ${added ? 'border-cyan-300/40 bg-cyan-400/10' : 'border-white/10 bg-slate-950/70'}`}>
                    <button aria-label={`${added ? 'Remove' : 'Add'} ${row.player}`} onClick={() => (added ? onRemoveLeg(row.id) : onAddLeg(row))} className="min-h-11 min-w-11 rounded-md border border-white/15 text-sm text-slate-100">{added ? '−' : '+'}</button>
                    <div className="flex-1">
                      <p className="text-sm text-slate-100">{row.player} {row.market.toUpperCase()}</p>
                      <p className="text-xs text-slate-400">L10 {row.hitRateL10}% · <span className="rounded bg-white/10 px-1 py-0.5">{row.riskTag}</span></p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-100">{row.line}</p>
                      <p className="text-xs text-slate-300">{row.odds}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
