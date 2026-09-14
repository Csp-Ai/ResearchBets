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
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -left-28 -top-20 h-[26rem] w-[26rem] rounded-full bg-emerald-400/[0.055] blur-[150px]" />
        <div className="absolute -right-40 top-[22rem] h-[28rem] w-[28rem] rounded-full bg-cyan-400/[0.05] blur-[160px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 pb-24 pt-4 sm:px-6 sm:pt-6">
        <header className="flex items-center justify-between">
          <Link href={nervous.toHref('/')} className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-[14px] border border-cyan-100/[0.12] bg-white/[0.035] text-[13px] font-black">R</div>
            <div>
              <div className="text-[14px] font-semibold tracking-[-0.03em]">ResearchBets</div>
              <div className="text-[9px] uppercase tracking-[0.2em] text-slate-600">Ticket Pulse</div>
            </div>
          </Link>
          <div className="flex items-center gap-2 rounded-full border border-emerald-300/[0.12] bg-emerald-300/[0.04] px-3 py-2 text-[10px] text-emerald-100/70">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-45" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" />
            </span>
            {mode === 'live' ? 'Live tracking' : mode === 'cache' ? 'Cached tracking' : 'Demo tracking'}
          </div>
        </header>

        <section className="relative mt-5 overflow-hidden rounded-[30px] border border-white/[0.07] bg-[linear-gradient(145deg,rgba(8,15,23,.94),rgba(3,7,12,.98))] px-5 py-6 sm:px-7 sm:py-8">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-100/[0.24] to-transparent" />
          <div className="relative grid gap-6 lg:grid-cols-[1.15fr_.85fr] lg:items-end">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-100/55">During · Ticket Pulse</div>
              <h1 className="mt-3 max-w-3xl text-[40px] font-semibold leading-[0.95] tracking-[-0.06em] sm:text-[60px]">
                Watch the ticket
                <span className="block bg-gradient-to-r from-white via-emerald-100 to-slate-400 bg-clip-text text-transparent">change shape live.</span>
              </h1>
              <p className="mt-4 max-w-2xl text-[13px] leading-6 text-slate-500 sm:text-[14px]">
                The same ticket identity from X-Ray now moves through live pace, strongest-leg support, weakest-leg pressure, coverage quality, and settlement.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-2xl border border-white/[0.065] bg-black/20 p-3">
                <div className="text-[8px] uppercase tracking-[0.14em] text-slate-600">Tracked</div>
                <div className="mt-1 text-[21px] font-semibold">{ticketCount}</div>
              </div>
              <div className="rounded-2xl border border-white/[0.065] bg-black/20 p-3">
                <div className="text-[8px] uppercase tracking-[0.14em] text-slate-600">Refresh</div>
                <div className="mt-1 text-[15px] font-semibold">15s</div>
              </div>
              <div className="rounded-2xl border border-white/[0.065] bg-black/20 p-3">
                <div className="text-[8px] uppercase tracking-[0.14em] text-slate-600">Stage</div>
                <div className="mt-1 text-[13px] font-semibold">During</div>
              </div>
            </div>
          </div>

          <div className="relative mt-6 flex flex-wrap items-center gap-2 text-[9px] uppercase tracking-[0.14em] text-slate-600">
            <span className="rounded-full border border-cyan-300/[0.12] bg-cyan-300/[0.035] px-3 py-2 text-cyan-100/65">Discover</span>
            <span>→</span>
            <Link href={nervous.toHref('/stress-test')} className="rounded-full border border-amber-300/[0.12] bg-amber-300/[0.035] px-3 py-2 text-amber-100/65">X-Ray</Link>
            <span>→</span>
            <span className="rounded-full border border-emerald-300/[0.18] bg-emerald-300/[0.055] px-3 py-2 text-emerald-100/80">Pulse</span>
            <span>→</span>
            <Link href={nervous.toHref('/review')} className="rounded-full border border-violet-300/[0.10] bg-violet-300/[0.025] px-3 py-2 text-violet-100/55">Autopsy</Link>
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-[28px] border border-white/[0.065] bg-white/[0.018] p-1 sm:p-2">
          <OpenTicketsPanel mode={mode} />
        </section>

        <div className="mt-5 flex flex-wrap gap-2">
          <Link href={nervous.toHref('/stress-test')} className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-[11px] font-semibold text-slate-300">← Back to X-Ray</Link>
          <Link href={nervous.toHref('/history')} className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-[11px] font-semibold text-slate-300">Ticket history</Link>
          <Link href={nervous.toHref('/review')} className="rounded-xl bg-white px-4 py-3 text-[11px] font-bold text-[#071015]">Open Autopsy →</Link>
        </div>
      </div>
    </main>
  );
}
