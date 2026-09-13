'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';
import { deriveLiveCommandSurface } from '@/src/core/cockpit/ticketLoop';
import {
  buildOpenTickets,
  type LiveCoverageMap,
  type LiveLegUpdate,
  type OpenTicket,
} from '@/src/core/live/openTickets';
import { listRecentSlips } from '@/src/core/slips/storage';
import { listTrackedTickets } from '@/src/core/track/store';
import type { TrackedTicket } from '@/src/core/track/types';

const pressureRank = { steady: 0, watch: 1, urgent: 2 } as const;

const pressureTone = (tone?: 'steady' | 'watch' | 'urgent') => {
  if (tone === 'urgent') return 'border-rose-300/[0.18] bg-rose-300/[0.055] text-rose-100';
  if (tone === 'watch') return 'border-amber-300/[0.17] bg-amber-300/[0.05] text-amber-100';
  return 'border-emerald-300/[0.14] bg-emerald-300/[0.035] text-emerald-100';
};

const legTone = (status?: string) => {
  if (!status) return 'text-slate-500';
  if (/critical|behind|breaking|missed/i.test(status)) return 'text-rose-200';
  if (/cleared|ahead|on pace|holds/i.test(status)) return 'text-emerald-200';
  return 'text-amber-200';
};

const formatAge = (iso: string | null) => {
  if (!iso) return 'waiting for refresh';
  const delta = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 1000));
  if (delta < 5) return 'updated now';
  if (delta < 60) return `updated ${delta}s ago`;
  return `updated ${Math.floor(delta / 60)}m ago`;
};

type TicketWithCommand = {
  ticket: OpenTicket;
  command: ReturnType<typeof deriveLiveCommandSurface>;
};

export function TicketPulseHero() {
  const nervous = useNervousSystem();
  const mode = (nervous.mode === 'live' || nervous.mode === 'cache' ? nervous.mode : 'demo') as
    | 'live'
    | 'cache'
    | 'demo';
  const [tracked, setTracked] = useState<TrackedTicket[]>([]);
  const [updates, setUpdates] = useState<Record<string, LiveLegUpdate>>({});
  const [coverage, setCoverage] = useState<LiveCoverageMap>({});
  const [nowIso, setNowIso] = useState(() => new Date().toISOString());
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => setTracked(listTrackedTickets());
    sync();
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  useEffect(() => {
    const clock = window.setInterval(() => setNowIso(new Date().toISOString()), 5000);
    return () => window.clearInterval(clock);
  }, []);

  useEffect(() => {
    if (mode !== 'live' || tracked.length === 0) return;

    const refresh = async () => {
      if (document.visibilityState === 'hidden') return;
      const response = await fetch('/api/live/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tickets: tracked }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        data?: { updates?: Record<string, LiveLegUpdate>; coverage?: LiveCoverageMap };
      };
      if (!response.ok || !payload.ok || !payload.data?.updates) return;
      setUpdates(payload.data.updates);
      setCoverage(payload.data.coverage ?? {});
      const stamp = new Date().toISOString();
      setLastUpdatedAt(stamp);
      setNowIso(stamp);
    };

    void refresh();
    const timer = window.setInterval(() => void refresh(), 30000);
    return () => window.clearInterval(timer);
  }, [mode, tracked]);

  const tickets = useMemo(
    () => buildOpenTickets(mode, tracked, listRecentSlips(), nowIso, updates, coverage),
    [mode, tracked, nowIso, updates, coverage],
  );

  const surfaces = useMemo<TicketWithCommand[]>(
    () => tickets.map((ticket) => ({ ticket, command: deriveLiveCommandSurface(ticket) })),
    [tickets],
  );

  const primary = useMemo(
    () =>
      [...surfaces].sort((a, b) => {
        const aRank = pressureRank[a.command?.ticketPressure.tone ?? 'steady'];
        const bRank = pressureRank[b.command?.ticketPressure.tone ?? 'steady'];
        if (aRank !== bRank) return bRank - aRank;
        return (a.ticket.onPaceCount / Math.max(1, a.ticket.legs.length)) -
          (b.ticket.onPaceCount / Math.max(1, b.ticket.legs.length));
      })[0],
    [surfaces],
  );

  const totalLegs = tickets.reduce((sum, ticket) => sum + ticket.legs.length, 0);
  const carrying = tickets.reduce((sum, ticket) => sum + ticket.onPaceCount, 0);

  if (tickets.length === 0) {
    return (
      <section className="relative overflow-hidden rounded-[28px] border border-white/[0.07] bg-[linear-gradient(145deg,rgba(9,15,24,.92),rgba(4,7,12,.96))] p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-cyan-300/[0.06] blur-[100px]" />
        <div className="relative">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-100/60">Ticket Pulse</div>
          <h1 className="mt-2 text-[30px] font-semibold tracking-[-0.05em]">Nothing is sweating yet.</h1>
          <p className="mt-2 max-w-xl text-[12px] leading-5 text-slate-500">Track a ticket and ResearchBets will surface the strongest leg, weakest leg, live pressure, and what changed without making you inspect every stat.</p>
          <div className="mt-5 flex gap-2">
            <Link href={nervous.toHref('/ingest')} className="rounded-xl bg-white px-4 py-3 text-[11px] font-bold text-[#071015]">Scan a ticket</Link>
            <Link href={nervous.toHref('/')} className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-[11px] font-semibold text-slate-300">Build from slate</Link>
          </div>
        </div>
      </section>
    );
  }

  const command = primary?.command;
  const ticket = primary?.ticket;
  const weakestState = ticket?.legs.find((leg) => leg.legId === command?.weakestLeg?.legId);
  const strongestState = ticket?.legs.find((leg) => leg.legId === command?.strongestLeg?.legId);

  return (
    <section className="relative overflow-hidden rounded-[30px] border border-white/[0.07] bg-[linear-gradient(145deg,rgba(9,15,24,.96),rgba(3,6,10,.98))] shadow-[0_24px_90px_rgba(0,0,0,.30)]">
      <style jsx>{`
        .pulse-wave { animation: pulseWave 3.2s ease-in-out infinite; }
        .pulse-scan { animation: pulseScan 4.2s linear infinite; }
        @keyframes pulseWave { 0%,100% { opacity:.32; transform:scaleX(.96); } 50% { opacity:.9; transform:scaleX(1); } }
        @keyframes pulseScan { from { transform:translateX(-120%); } to { transform:translateX(520%); } }
        @media (prefers-reduced-motion: reduce) { .pulse-wave,.pulse-scan { animation:none !important; } }
      `}</style>

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-cyan-300/[0.06] blur-[120px]" />
        <div className="pulse-scan absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-transparent via-cyan-100/[0.025] to-transparent" />
      </div>

      <div className="relative border-b border-white/[0.06] px-5 py-5 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-100/60">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-300 opacity-40" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-300" />
              </span>
              Ticket Pulse · {mode}
            </div>
            <h1 className="mt-2 text-[30px] font-semibold tracking-[-0.05em] sm:text-[38px]">Know what is carrying the ticket.</h1>
            <p className="mt-2 text-[11px] text-slate-600">{formatAge(lastUpdatedAt)} · {tickets.length} tracked ticket{tickets.length === 1 ? '' : 's'}</p>
          </div>

          <div className="grid min-w-[240px] grid-cols-3 gap-2">
            <div className="rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2.5">
              <div className="text-[8px] uppercase tracking-[0.13em] text-slate-600">Tickets</div>
              <div className="mt-1 text-[18px] font-semibold">{tickets.length}</div>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2.5">
              <div className="text-[8px] uppercase tracking-[0.13em] text-slate-600">Carrying</div>
              <div className="mt-1 text-[18px] font-semibold">{carrying}/{totalLegs}</div>
            </div>
            <div className={`rounded-xl border px-3 py-2.5 ${pressureTone(command?.ticketPressure.tone)}`}>
              <div className="text-[8px] uppercase tracking-[0.13em] opacity-55">Pressure</div>
              <div className="mt-1 truncate text-[10px] font-semibold">{command?.ticketPressure.label ?? 'Stable'}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative grid gap-0 lg:grid-cols-[1.05fr_.95fr]">
        <div className="border-b border-white/[0.06] p-5 sm:p-6 lg:border-b-0 lg:border-r">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[9px] uppercase tracking-[0.16em] text-slate-600">Highest attention ticket</div>
              <div className="mt-2 text-[20px] font-semibold tracking-[-0.035em]">{ticket?.title ?? 'Tracked ticket'}</div>
              <div className="mt-1 text-[11px] text-slate-500">{ticket?.onPaceCount ?? 0}/{ticket?.legs.length ?? 0} legs carrying · {ticket?.coverage.coverage ?? 'unknown'} live coverage</div>
            </div>
            <span className={`rounded-full border px-2.5 py-1 text-[9px] font-semibold ${pressureTone(command?.ticketPressure.tone)}`}>{command?.ticketThesis.state?.replace(/_/g, ' ') ?? command?.badge ?? 'live'}</span>
          </div>

          <div className="mt-5 rounded-2xl border border-cyan-200/[0.09] bg-cyan-300/[0.03] p-4">
            <div className="text-[9px] uppercase tracking-[0.15em] text-cyan-100/45">Ticket thesis</div>
            <div className="mt-1 text-[16px] font-semibold text-slate-100">{command?.ticketThesis.headline ?? command?.headline ?? 'Ticket is waiting for separation.'}</div>
            <p className="mt-2 text-[11px] leading-5 text-slate-500">{command?.ticketThesis.subheadline ?? command?.ticketPressure.detail ?? 'Live structure is still developing.'}</p>
          </div>

          <div className="pulse-wave mt-5 flex items-end gap-1 overflow-hidden rounded-xl border border-white/[0.05] bg-black/20 px-3 py-3" aria-hidden="true">
            {[22, 32, 18, 42, 28, 56, 34, 66, 38, 74, 48, 62, 30, 52, 24, 40, 18].map((height, index) => (
              <div key={index} className={`w-full rounded-full ${index > 9 ? 'bg-cyan-300/55' : 'bg-white/[0.10]'}`} style={{ height: `${height * 0.55}px` }} />
            ))}
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <article className="rounded-2xl border border-emerald-300/[0.11] bg-emerald-300/[0.03] p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[9px] uppercase tracking-[0.15em] text-emerald-100/45">Carrying hardest</div>
                <div className={`text-[9px] font-semibold ${legTone(command?.strongestLeg?.status)}`}>{command?.strongestLeg?.status ?? 'waiting'}</div>
              </div>
              <div className="mt-2 text-[15px] font-semibold">{command?.strongestLeg?.player ?? 'No leader yet'}</div>
              <p className="mt-1 text-[10px] leading-5 text-slate-500">{command?.strongestLeg?.why ?? 'The ticket has not separated enough to name a strongest leg.'}</p>
              {strongestState ? <div className="mt-2 text-[10px] text-emerald-100/55">{strongestState.currentValue}/{strongestState.threshold} · projection {strongestState.paceProjection}</div> : null}
            </article>

            <article className="rounded-2xl border border-rose-300/[0.12] bg-rose-300/[0.035] p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[9px] uppercase tracking-[0.15em] text-rose-100/45">Primary pressure point</div>
                <div className={`text-[9px] font-semibold ${legTone(command?.weakestLeg?.status)}`}>{command?.weakestLeg?.status ?? 'waiting'}</div>
              </div>
              <div className="mt-2 text-[15px] font-semibold">{command?.weakestLeg?.player ?? 'No weak spot yet'}</div>
              <p className="mt-1 text-[10px] leading-5 text-slate-500">{command?.primaryFailurePoint ?? 'No failure point has separated yet.'}</p>
              {weakestState ? <div className="mt-2 text-[10px] text-rose-100/55">Needs {weakestState.requiredRemaining} · {weakestState.currentValue}/{weakestState.threshold}</div> : null}
            </article>
          </div>

          <div className="mt-3 rounded-2xl border border-white/[0.06] bg-white/[0.018] p-4">
            <div className="text-[9px] uppercase tracking-[0.15em] text-slate-600">What to watch next</div>
            <p className="mt-2 text-[11px] leading-5 text-slate-400">{command?.gameScript ?? command?.attention ?? 'Watch the next meaningful swing.'}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
