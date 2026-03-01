'use client';

import Link from 'next/link';

import type { SlipBuilderLeg } from '@/features/betslip/SlipBuilder';

type LegStrength = 'weak' | 'caution' | 'strong';

function legStrength(leg: SlipBuilderLeg): LegStrength {
  const confidence = leg.confidence ?? 0;
  if (confidence < 0.5) return 'weak';
  if (confidence < 0.65) return 'caution';
  return 'strong';
}

export function QuickSlipRailMini({
  slip,
  weakestLeg,
  correlationLabel,
  fragility,
  flashLegId,
  onUpdateLeg,
  onRemoveLeg,
  stressHref,
  buildHref,
  latestRunHref,
  openTicketsHref,
  onTrySampleSlip,
}: {
  slip: SlipBuilderLeg[];
  weakestLeg: string;
  correlationLabel: 'low' | 'med' | 'high';
  fragility: number;
  flashLegId: string | null;
  onUpdateLeg: (leg: SlipBuilderLeg) => void;
  onRemoveLeg: (legId: string) => void;
  stressHref: string;
  buildHref: string;
  latestRunHref?: string;
  openTicketsHref?: string;
  onTrySampleSlip: () => void;
}) {
  const canRun = slip.length >= 2;

  return (
    <section className="flex h-full flex-col rounded-2xl border border-white/10 bg-slate-900/70 p-4 sm:p-5" aria-label="quick-slip-rail-mini">
      <h2 className="text-base font-semibold text-white sm:text-lg">Draft Ticket</h2>
      <div className="mt-2 rounded-lg border border-white/10 bg-slate-950/35 p-3 text-xs text-slate-300">
        <p>{slip.length} legs · Correlation {correlationLabel}</p>
        <p>Fragility {fragility}/100 · Weakest leg: {weakestLeg}</p>
      </div>

      <div className="mt-3 flex-1">
        {slip.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/20 p-3 text-sm text-slate-300">
            Add from the board to stage your slip.
          </div>
        ) : (
          <ul className="space-y-2 text-sm">
            {slip.map((leg) => {
              const strength = legStrength(leg);
              return (
                <li key={leg.id} className={`rounded-md border bg-slate-950/25 p-2 transition ${flashLegId === leg.id ? 'border-cyan-300/70 ring-1 ring-cyan-300/60' : 'border-white/10'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-slate-100">{leg.player} · {leg.marketType.toUpperCase()} {leg.line} <span className="mono-number text-slate-300">{leg.odds}</span></p>
                    <div className="flex items-center gap-1.5">
                      <span className="rounded border border-white/20 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-slate-300">{strength}</span>
                      <button type="button" onClick={() => onRemoveLeg(leg.id)} className="min-h-8 rounded-md px-2 text-xs text-slate-300 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70">Remove</button>
                    </div>
                  </div>
                  <label className="mt-2 grid grid-cols-[auto_1fr] items-center gap-2 text-xs text-slate-400">
                    <span>Line</span>
                    <input
                      aria-label={`line-${leg.id}`}
                      value={leg.line}
                      onChange={(event) => onUpdateLeg({ ...leg, line: event.target.value })}
                      className="min-h-8 w-full rounded-md border border-white/20 bg-slate-950/60 px-2 py-1 text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
                    />
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="mt-4 border-t border-white/10 pt-3">
        <Link
          aria-disabled={!canRun}
          href={canRun ? stressHref : '#'}
          onClick={(event) => {
            if (!canRun) event.preventDefault();
          }}
          className={`flex justify-center rounded-md px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 ${canRun ? 'bg-cyan-300 text-slate-950 hover:bg-cyan-200' : 'cursor-not-allowed bg-slate-700/50 text-slate-300'}`}
        >
          Run Stress Test
        </Link>
        {!canRun ? <p className="mt-1 text-xs text-slate-400">Add 2+ legs to isolate weakest-leg + correlation pressure.</p> : null}
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" onClick={onTrySampleSlip} className="rounded-md border border-white/20 px-3 py-2 text-sm text-slate-100 transition hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70">Try sample slip</button>
          <Link href={buildHref} className="rounded-md border border-white/20 px-3 py-2 text-sm text-slate-100 transition hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70">Build from Board</Link>
          {latestRunHref ? <Link href={latestRunHref} className="rounded-md border border-white/20 px-3 py-2 text-sm text-slate-100 transition hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70">Open latest run</Link> : null}
          {openTicketsHref ? <Link href={openTicketsHref} className="rounded-md border border-white/20 px-3 py-2 text-sm text-slate-100 transition hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70">Open Tickets</Link> : null}
        </div>
      </div>
    </section>
  );
}
