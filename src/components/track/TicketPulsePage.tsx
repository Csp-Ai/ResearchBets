'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';
import { OpenTicketsPanel } from '@/src/components/track/OpenTicketsPanel';
import { listTrackedTickets } from '@/src/core/track/store';

export function TicketPulsePage() {
  const nervous = useNervousSystem();
  const [ticketCount, setTicketCount] = useState(0);

  useEffect(() => {
    const sync = () => setTicketCount(listTrackedTickets().length);
    sync();
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  const mode = nervous.mode === 'demo' || nervous.mode === 'cache' || nervous.mode === 'live'
    ? nervous.mode
    : 'live';

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#03060a] text-white">
      <div className="relative mx-auto max-w-6xl px-4 pb-24 pt-5 sm:px-6 sm:pt-7">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-5">
          <Link href={nervous.toHref('/')} className="flex min-h-11 items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-[12px] font-black">R</div>
            <div>
              <div className="text-sm font-semibold tracking-[-0.02em]">ResearchBets</div>
              <div className="text-[9px] uppercase tracking-[0.18em] text-slate-500">Ticket Pulse</div>
            </div>
          </Link>
          <div className="text-left sm:text-right">
            <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Requested context</div>
            <div className="mt-1 text-xs text-slate-300">
              {mode === 'live' ? 'Live tracking' : mode === 'cache' ? 'Cached tracking' : 'Demo tracking'}
            </div>
          </div>
        </header>

        <section className="py-7 sm:py-9">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-3xl">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-100/60">
                ResearchBets live read
              </div>
              <h1 className="mt-3 text-[32px] font-semibold leading-[1.02] tracking-[-0.045em] sm:text-[48px]">
                What changed since X-Ray?
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
                Pulse keeps the same ticket thesis alive during the game: what is carrying, what is under pressure, and whether the original weak point still matters.
              </p>
            </div>

            <div className="w-full border-t border-white/10 pt-4 sm:w-auto sm:min-w-[180px] sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
              <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Tracked tickets</div>
              <div className="mt-1 font-mono text-2xl font-semibold text-slate-100">{ticketCount}</div>
              <div className="mt-2 max-w-sm text-[11px] leading-5 text-slate-500">
                Live freshness and coverage are verified per ticket below. Missing evidence stays unknown.
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-white/10 py-5">
          <OpenTicketsPanel mode={mode} />
        </section>

        <section className="mt-6 flex flex-col gap-4 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Next lifecycle action</div>
            <p className="mt-1 text-sm leading-6 text-slate-300">
              When the ticket settles, compare the original X-Ray pressure with what actually broke or held.
            </p>
          </div>
          <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-2">
            <Link
              href={nervous.toHref('/stress-test')}
              className="flex min-h-11 items-center justify-center rounded-xl border border-white/10 px-4 py-2.5 text-xs font-medium text-slate-300 hover:border-white/20"
            >
              Back to X-Ray
            </Link>
            <Link
              href={nervous.toHref('/review')}
              className="flex min-h-11 items-center justify-center rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-[#071015]"
            >
              Review outcome →
            </Link>
          </div>
        </section>

        <details className="mt-5 border-t border-white/8 pt-4 text-xs text-slate-400">
          <summary className="flex min-h-11 cursor-pointer select-none items-center font-medium text-slate-400 hover:text-white">
            More ticket tools
          </summary>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
            <Link
              href={nervous.toHref('/history')}
              className="flex min-h-11 items-center justify-center rounded-lg border border-white/10 px-3 py-2 text-slate-300"
            >
              Ticket history
            </Link>
            <Link
              href={nervous.toHref('/')}
              className="flex min-h-11 items-center justify-center rounded-lg border border-white/10 px-3 py-2 text-slate-300"
            >
              Build another ticket
            </Link>
          </div>
        </details>
      </div>
    </main>
  );
}
