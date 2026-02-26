import React from 'react';
import Link from 'next/link';

import { appendQuery } from '@/src/components/landing/navigation';
import { LandingTerminalShell } from '@/src/components/landing/LandingTerminalShell';
import { fallbackToday } from '@/src/core/today/fallback';
import { toHref } from '@/src/core/nervous/routes';
import { DEFAULT_SPINE, type QuerySpine } from '@/src/core/nervous/spine';

type BoardPreviewSSRProps = {
  spine: QuerySpine;
};

export function BoardPreviewSSR({ spine }: BoardPreviewSSRProps) {
  const today = fallbackToday(spine);
  const games = today.games.slice(0, 3);

  return (
    <div data-landing-ssr>
      <LandingTerminalShell mode={today.mode} reason={today.reason} className="border-cyan-300/15" >
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="grid gap-3 sm:grid-cols-2">
            {games.map((game) => {
              const props = today.board.filter((item) => item.gameId === game.id).slice(0, 3);
              return (
                <article key={game.id} className="rounded-xl border border-white/10 bg-slate-950/70 p-3">
                  <p className="text-sm font-medium text-slate-100">{game.matchup}</p>
                  <p className="text-xs text-slate-400">{game.startTime}</p>
                  <div className="mt-2 divide-y divide-white/10 rounded-md border border-white/10 bg-slate-950/60">
                    {props.map((prop) => (
                      <div key={prop.id} className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto_auto_auto] items-center gap-2 px-2 py-1 text-[11px] text-slate-200">
                        <span className="truncate" title={prop.player}>{prop.player}</span>
                        <span className="truncate text-slate-300">{prop.market} {prop.line}</span>
                        <span className="rounded-full border border-cyan-300/30 px-1.5 py-0.5 text-[10px] text-cyan-100">L10 58%</span>
                        <span className="text-slate-300">{prop.odds}</span>
                        <span className="text-cyan-200">＋</span>
                      </div>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
          <aside className="rounded-xl border border-white/10 bg-slate-950/70 p-4">
            <h3 className="text-sm font-semibold">Slip rail</h3>
            <p className="mt-2 text-sm text-slate-400">No legs yet. Add 2–3 legs from the board to run a quick stress test.</p>
            <div className="mt-4 rounded-md border border-white/10 bg-slate-900/70 px-3 py-2 text-xs text-slate-300">
              Legs: 0 · Correlation watch: Low · Fragility: Moderate
            </div>
            <p className="mt-4 rounded-md border border-white/15 px-3 py-2 text-center text-sm font-semibold text-slate-500">Start by adding legs →</p>
          </aside>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <Link href={toHref('/today', spine)} className="rounded-md border border-cyan-300/60 px-3 py-1.5 text-cyan-100">Open full board</Link>
          <Link href={appendQuery(toHref('/slip', spine), { sample: '1' })} className="rounded-md border border-white/15 px-3 py-1.5 text-slate-200">Try sample slip</Link>
        </div>
      </LandingTerminalShell>
    </div>
  );
}

export function getLandingSpineFromSearch(searchParams?: Record<string, string | string[] | undefined>): QuerySpine {
  const read = (key: keyof QuerySpine) => {
    const value = searchParams?.[key];
    return Array.isArray(value) ? value[0] : value;
  };

  return {
    sport: read('sport') ?? DEFAULT_SPINE.sport,
    tz: read('tz') ?? DEFAULT_SPINE.tz,
    date: read('date') ?? DEFAULT_SPINE.date,
    mode: read('mode') === 'live' ? 'live' : 'demo',
    trace_id: read('trace_id') ?? DEFAULT_SPINE.trace_id,
  };
}
