'use client';

import { useEffect, useMemo, useState } from 'react';

import { DuringCoach } from '@/src/components/track/DuringCoach';
import { buildOpenTickets, computeExposureSummary, type LiveCoverageMap, type LiveLegState, type LiveLegUpdate, type OpenTicket } from '@/src/core/live/openTickets';
import { listRecentSlips } from '@/src/core/slips/storage';
import { listTrackedTickets } from '@/src/core/track/store';
import type { TrackedTicket } from '@/src/core/track/types';

const statusTone: Record<LiveLegState['status'], string> = {
  ahead: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100',
  on_pace: 'border-cyan-400/40 bg-cyan-500/10 text-cyan-100',
  behind: 'border-amber-400/40 bg-amber-500/10 text-amber-100',
  needs_spike: 'border-rose-400/40 bg-rose-500/10 text-rose-100'
};

export function OpenTicketsPanel({ mode }: { mode: 'demo' | 'cache' | 'live' }) {
  const [nowIso, setNowIso] = useState(() => new Date().toISOString());
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [autoRefresh, setAutoRefresh] = useState(mode === 'live');
  const [liveUpdates, setLiveUpdates] = useState<Record<string, LiveLegUpdate>>({});
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [trackedTickets, setTrackedTickets] = useState<TrackedTicket[]>([]);
  const [coverage, setCoverage] = useState<LiveCoverageMap>({});
  const [sweatMode, setSweatMode] = useState(true);

  useEffect(() => {
    setTrackedTickets(listTrackedTickets());
    const sync = () => setTrackedTickets(listTrackedTickets());
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  useEffect(() => {
    if (mode !== 'live') {
      setAutoRefresh(false);
      return;
    }
    setAutoRefresh(true);
  }, [mode]);

  useEffect(() => {
    const timer = window.setInterval(() => setNowIso(new Date().toISOString()), 5000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (mode !== 'live' || !autoRefresh) return;

    const refresh = async () => {
      if (document.visibilityState === 'hidden') return;
      const payloadTickets = listTrackedTickets();
      if (payloadTickets.length === 0) return;

      const response = await fetch('/api/live/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tickets: payloadTickets })
      });
      const payload = await response.json() as { ok?: boolean; data?: { updates?: Record<string, LiveLegUpdate>; coverage?: LiveCoverageMap } };
      if (!response.ok || !payload.ok || !payload.data?.updates) return;
      setLiveUpdates(payload.data.updates);
      setCoverage(payload.data.coverage ?? {});
      const stamped = new Date().toISOString();
      setLastUpdatedAt(stamped);
      setNowIso(stamped);
    };

    void refresh();
    const timer = window.setInterval(() => {
      void refresh();
    }, 15000);

    return () => window.clearInterval(timer);
  }, [mode, autoRefresh]);

  const tickets = useMemo(() => buildOpenTickets(mode, trackedTickets, listRecentSlips(), nowIso, liveUpdates, coverage), [mode, nowIso, liveUpdates, trackedTickets, coverage]);
  const exposure = useMemo(() => computeExposureSummary(tickets), [tickets]);

  return (
    <section className="rounded-xl border border-slate-700 bg-slate-950/70 p-4" data-testid="open-tickets-panel">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Open Tickets</h2>
        <p className="text-xs text-slate-400">Live progress view</p>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <span>Auto-refresh: {mode === 'live' && autoRefresh ? 'On' : 'Off'}</span>
          <button type="button" className="rounded border border-white/20 px-2 py-0.5" onClick={() => setAutoRefresh((value) => !value)} disabled={mode !== 'live'}>
            {autoRefresh ? 'Turn off' : 'Turn on'}
          </button>
          <span className="ml-2">Sweat mode: {sweatMode ? 'On' : 'Off'}</span>
          <button type="button" className="rounded border border-white/20 px-2 py-0.5" onClick={() => setSweatMode((value) => !value)}>
            {sweatMode ? 'Hide details' : 'Show details'}
          </button>
        </div>
        <span>Last updated: {lastUpdatedAt ? new Date(lastUpdatedAt).toLocaleTimeString() : '—'}</span>
      </div>

      {tickets.length === 0 ? (
        <div className="mt-3 rounded-lg border border-slate-700 bg-slate-900/60 p-3 text-sm">
          <p className="font-medium">No open tickets yet</p>
          <p className="mt-1 text-slate-300">Build from Board · Try sample slip · Open last run</p>
        </div>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap gap-2 text-xs" data-testid="exposure-row">
            {exposure.byGame.map((item) => <span key={item} className="rounded-full border border-white/15 px-2 py-1">{item}</span>)}
            <span className="rounded-full border border-amber-300/30 px-2 py-1">High variance legs: {exposure.highVarianceLegs}</span>
            {(exposure.overlaps.length > 0 ? exposure.overlaps : ['No repeated players']).map((item) => (
              <span key={item} className="rounded-full border border-cyan-300/30 px-2 py-1">{item}</span>
            ))}
          </div>

          <ul className="mt-3 space-y-2">
            {tickets.slice(0, 5).map((ticket, index) => {
              const isExpanded = !!expanded[ticket.ticketId];
              return (
                <li key={ticket.ticketId} className="rounded-lg border border-slate-700 bg-slate-900/60 p-3" data-testid={`ticket-${index + 1}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">{ticket.title} • {ticket.odds} • {ticket.wager}</p>
                    <p className="text-xs text-slate-300">{ticket.onPaceCount}/{ticket.legs.length} legs on pace</p>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    {sweatMode ? (
                      <>
                        <span className="rounded-full border border-amber-300/30 bg-amber-500/10 px-2 py-1">Weakest now: {ticket.weakestLeg.player}</span>
                        {ticket.weakestLeg.reasonChips.map((reason) => <span key={`${ticket.ticketId}-${reason}`} className="rounded-full border border-white/15 px-2 py-1">{reason}</span>)}
                      </>
                    ) : null}
                    {ticket.cashoutAvailable && typeof ticket.cashoutValue === 'number' ? <span className="rounded-full border border-emerald-300/30 bg-emerald-500/10 px-2 py-1">${ticket.cashoutValue.toFixed(2)} · Cashout available</span> : <span className="rounded-full border border-slate-300/40 bg-slate-500/10 px-2 py-1">Cashout: unknown (not connected)</span>}
                    {ticket.coverage.coverage !== 'full' ? <span className="rounded-full border border-slate-300/40 bg-slate-500/10 px-2 py-1" title={`${ticket.coverage.coveredLegs}/${ticket.coverage.totalLegs} legs covered`}>Partial live coverage</span> : null}
                  </div>

                  <DuringCoach ticket={ticket} compact={!sweatMode} />

                  {ticket.rawSlipText ? (
                    <details className="mt-2 text-xs text-slate-300">
                      <summary className="cursor-pointer">Slip debug</summary>
                      <p className="mt-1 whitespace-pre-wrap">{ticket.rawSlipText}</p>
                    </details>
                  ) : null}

                  {sweatMode ? (
                    <button
                      type="button"
                      className="mt-2 text-xs text-cyan-200 underline"
                      onClick={() => setExpanded((prev) => ({ ...prev, [ticket.ticketId]: !isExpanded }))}
                    >
                      {isExpanded ? 'Hide legs' : 'Expand legs'}
                    </button>
                  ) : null}

                  {sweatMode && isExpanded ? (
                    <ul className="mt-2 space-y-2 text-xs">
                      {ticket.legs.map((leg) => (
                        <li key={leg.legId} className="rounded border border-slate-700 p-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p>{leg.player} · {leg.marketType} {leg.currentValue.toFixed(1)}/{leg.threshold}</p>
                            <span className={`rounded-full border px-2 py-0.5 ${statusTone[leg.status]}`}>{leg.status.replace('_', ' ')}</span>
                          </div>
                          <p className="mt-1 text-slate-300">Pace projection: {leg.paceProjection.toFixed(1)} · Need {leg.requiredRemaining.toFixed(1)} more</p>
                          <div className="mt-1 flex gap-2">
                            <span className="rounded border border-white/20 px-1.5 py-0.5">{leg.volatility}</span>
                            {leg.minutesRisk ? <span className="rounded border border-amber-300/30 px-1.5 py-0.5">Minutes risk (margin)</span> : null}
                            {leg.coverage.coverage === 'missing' ? <span className="rounded border border-slate-300/30 px-1.5 py-0.5 text-slate-300">{leg.coverage.reason ?? 'provider_unavailable'}</span> : null}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}

export type { OpenTicket };
