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
      <LandingTerminalShell
        mode={today.mode}
        reason={today.reason}
        className="border-cyan-300/15"
        hooksSlot={(
          <div className="mb-3 rounded-lg border border-cyan-300/20 bg-slate-950/70 p-2.5" data-testid="landing-hooks-ssr">
            <p className="text-[11px] uppercase tracking-[0.16em] text-cyan-200/90">Signal hooks</p>
            <div className="mt-2 space-y-2">
              {Array.from({ length: 3 }, (_, index) => (
                <div key={`hook-placeholder-${index}`} className="rounded-md border border-white/10 bg-slate-900/60 p-2">
                  <div className="h-3 w-1/3 rounded bg-white/10" />
                  <div className="mt-1 h-3 w-5/6 rounded bg-white/10" />
                  <div className="mt-2 h-6 w-20 rounded border border-white/10" />
                </div>
              ))}
            </div>
          </div>
        )}
      >
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs text-slate-400">
              <span>{`${games.length} games · ${today.board.slice(0, 6).length} props`}</span>
              <Link href={toHref('/today', spine)} className="text-cyan-200 hover:text-cyan-100">Open full board</Link>
            </div>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {games.map((game) => {
                const props = today.board.filter((item) => item.gameId === game.id).slice(0, 3);
                return (
                  <article key={game.id} className="rounded-xl border border-white/10 bg-slate-950/70 p-2.5">
                    <p className="text-sm font-medium text-slate-100">{game.matchup}</p>
                    <p className="text-xs text-slate-400">{game.startTime}</p>
                    <div className="mt-1.5 divide-y divide-white/10 rounded-md border border-white/10 bg-slate-950/60" data-testid="terminal-prop-rows">
                      {props.map((prop) => (
                        <div key={prop.id} className="grid h-9 grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_auto_auto_auto_auto] items-center gap-2 px-2 text-[11px] text-slate-200">
                          <span className="truncate font-medium" title={prop.player}>{prop.player}</span>
                          <span className="truncate font-mono text-slate-300">{prop.market} {prop.line}</span>
                          <span className="rounded-full border border-cyan-300/30 px-1.5 py-0.5 text-[10px] text-cyan-100">L10 58%</span>
                          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-white/20 px-1 text-[10px] leading-none text-slate-300">i</span>
                          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-white/20 px-1 text-[10px] leading-none text-cyan-200">＋</span>
                        </div>
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-xl border border-white/10 bg-slate-950/70 p-3 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
              <h3 className="text-sm font-semibold">Slip rail</h3>
              <p className="mt-2 text-sm text-slate-400">No legs yet. Add 2–3 legs from the board to run a quick stress test.</p>
              <div className="mt-3 rounded-md border border-white/10 bg-slate-900/70 px-3 py-2 text-xs text-slate-300">
                Legs: 0 · Correlation watch: Low · Fragility: Moderate
              </div>
              <div className="mt-3 lg:sticky lg:bottom-0 lg:bg-slate-950/90 lg:pt-2">
                <p className="rounded-md border border-white/15 px-3 py-2 text-center text-sm font-semibold text-slate-500">Start by adding legs →</p>
              </div>
            </div>
          </aside>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
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
