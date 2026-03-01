'use client';

type BoardRow = {
  id: string;
  matchup: string;
  player: string;
  market: string;
  line: string;
  odds: string;
  hitRateL10: number;
  riskTag: string;
};

function riskLabel(riskTag: string) {
  if (riskTag === 'watch') return 'minutes';
  return riskTag || 'pace';
}

export function BoardMini({
  rows,
  loading,
  onAddLeg,
  modeCopy,
}: {
  rows: BoardRow[];
  loading: boolean;
  onAddLeg: (row: BoardRow) => void;
  modeCopy: string;
}) {
  const grouped = rows.reduce<Map<string, BoardRow[]>>((acc, row) => {
    const current = acc.get(row.matchup) ?? [];
    current.push(row);
    acc.set(row.matchup, current);
    return acc;
  }, new Map());

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 sm:p-5" aria-label="tonight-board-mini">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-white sm:text-lg">Tonight&apos;s Board</h2>
        <span data-testid="today-mode-chip" className="rounded-full border border-white/15 bg-slate-950/40 px-2 py-0.5 text-[11px] text-slate-200">{modeCopy}</span>
      </div>
      <p className="mt-1 text-xs text-slate-400">Add 2–4 legs, then run Stress Test.</p>

      <div className="mt-3 space-y-2">
        {loading ? <p className="text-sm text-slate-400">Loading board…</p> : null}
        {!loading && grouped.size === 0 ? <p className="text-sm text-slate-400">Board unavailable. Demo leads stay on by default.</p> : null}
        {[...grouped.entries()].map(([matchup, groupRows]) => (
          <div key={matchup} className="space-y-1.5">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">{matchup}</p>
            {groupRows.map((row) => (
              <div key={row.id} className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-slate-950/25 px-2.5 py-2 transition hover:border-cyan-300/40 hover:bg-slate-900/80">
                <div className="min-w-0">
                  <p className="truncate text-sm text-slate-100">{row.player} · {row.market.toUpperCase()} {row.line} <span className="mono-number text-slate-300">{row.odds}</span></p>
                  <p className="text-[11px] text-slate-400">L10 {Math.round(row.hitRateL10)}% · {riskLabel(row.riskTag)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onAddLeg(row)}
                  className="min-h-8 rounded-md border border-cyan-300/40 px-2.5 text-xs font-medium text-cyan-100 transition hover:bg-cyan-300/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
                >
                  Add
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

export type { BoardRow };
