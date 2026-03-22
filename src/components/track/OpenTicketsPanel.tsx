'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { DuringCoach } from '@/src/components/track/DuringCoach';
import { CardSurface } from '@/src/components/ui/CardSurface';
import { appendQuery } from '@/src/components/landing/navigation';
import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';
import { getLoopTrustBadges } from '@/src/core/bettor-loop/provenance';
import {
  buildOpenTickets,
  computeExposureSummary,
  type LiveCoverageMap,
  type LiveLegUpdate,
  type OpenTicket
} from '@/src/core/live/openTickets';
import { settleTicket } from '@/src/core/review/settlement';
import { deriveLiveCommandSurface } from '@/src/core/cockpit/ticketLoop';
import type { TicketSettlementStatus } from '@/src/core/review/types';
import { listRecentSlips } from '@/src/core/slips/storage';
import { listTrackedTickets } from '@/src/core/track/store';
import type { TrackedTicket } from '@/src/core/track/types';

const liveStatusTone: Record<string, string> = {
  cleared: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100',
  'ahead of pace': 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100',
  'needs one event': 'border-cyan-400/40 bg-cyan-500/10 text-cyan-100',
  'on pace': 'border-cyan-400/40 bg-cyan-500/10 text-cyan-100',
  'in progress': 'border-slate-400/40 bg-slate-500/10 text-slate-100',
  'slightly behind': 'border-amber-300/40 bg-amber-500/10 text-amber-100',
  'awaiting movement': 'border-amber-300/40 bg-amber-500/10 text-amber-100',
  'behind pace': 'border-amber-400/40 bg-amber-500/10 text-amber-100',
  critical: 'border-rose-400/40 bg-rose-500/10 text-rose-100'
};

export function OpenTicketsPanel({ mode }: { mode: 'demo' | 'cache' | 'live' }) {
  const nervous = useNervousSystem();
  const [nowIso, setNowIso] = useState(() => new Date().toISOString());
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [autoRefresh, setAutoRefresh] = useState(mode === 'live');
  const [liveUpdates, setLiveUpdates] = useState<Record<string, LiveLegUpdate>>({});
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [trackedTickets, setTrackedTickets] = useState<TrackedTicket[]>([]);
  const [coverage, setCoverage] = useState<LiveCoverageMap>({});
  const [sweatMode, setSweatMode] = useState(true);
  const [settleTicketId, setSettleTicketId] = useState<string | null>(null);
  const [settlementStatus, setSettlementStatus] = useState<TicketSettlementStatus>('unknown');
  const [finalValues, setFinalValues] = useState<Record<string, string>>({});
  const [cashoutTaken, setCashoutTaken] = useState('');
  const [saveToast, setSaveToast] = useState<string | null>(null);

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
      const payload = (await response.json()) as {
        ok?: boolean;
        data?: { updates?: Record<string, LiveLegUpdate>; coverage?: LiveCoverageMap };
      };
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

  const tickets = useMemo(
    () => buildOpenTickets(mode, trackedTickets, listRecentSlips(), nowIso, liveUpdates, coverage),
    [mode, nowIso, liveUpdates, trackedTickets, coverage]
  );
  const exposure = useMemo(() => computeExposureSummary(tickets), [tickets]);
  const activeSettleTicket = tickets.find((ticket) => ticket.ticketId === settleTicketId);

  const openSettle = (ticket: OpenTicket) => {
    setSettleTicketId(ticket.ticketId);
    setSettlementStatus('unknown');
    setFinalValues(
      Object.fromEntries(ticket.legs.map((leg) => [leg.legId, leg.currentValue.toFixed(1)]))
    );
    setCashoutTaken(ticket.cashoutValue?.toFixed(2) ?? '');
  };

  const onSaveSettlement = () => {
    if (!activeSettleTicket) return;
    const normalizedFinal = Object.fromEntries(
      activeSettleTicket.legs.map((leg) => [
        leg.legId,
        Number(finalValues[leg.legId] ?? leg.currentValue)
      ])
    ) as Record<string, number>;

    settleTicket({
      ticket: activeSettleTicket,
      status: settlementStatus,
      finalValues: normalizedFinal,
      cashoutTaken: cashoutTaken ? Number(cashoutTaken) : undefined
    });
    setSettleTicketId(null);
    setSaveToast('Postmortem saved');
    window.setTimeout(() => setSaveToast(null), 1500);
  };

  return (
    <CardSurface className="p-4" data-testid="open-tickets-panel">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Live Ticket Command Center</h2>
        <p className="text-xs text-slate-400">
          Track what is carrying the ticket and what can break it.
        </p>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <span>Auto-refresh: {mode === 'live' && autoRefresh ? 'On' : 'Off'}</span>
          <button
            type="button"
            className="rounded border border-white/20 px-2 py-0.5"
            onClick={() => setAutoRefresh((value) => !value)}
            disabled={mode !== 'live'}
          >
            {autoRefresh ? 'Turn off' : 'Turn on'}
          </button>
          <button
            type="button"
            className="ml-2 rounded-md border border-white/15 bg-slate-900/70 px-2 py-0.5 transition hover:border-cyan-300/40"
            onClick={() => setSweatMode((value) => !value)}
          >
            {sweatMode ? 'Hide details' : 'Show details'}
          </button>
        </div>
        <span>
          Last updated: {lastUpdatedAt ? new Date(lastUpdatedAt).toLocaleTimeString() : '—'}
        </span>
      </div>

      {saveToast ? <p className="mt-2 text-xs text-emerald-200">{saveToast}</p> : null}

      {tickets.length === 0 ? (
        <div className="mt-3 rounded-lg border border-slate-700 bg-slate-900/60 p-3 text-sm">
          <p className="font-medium">No open tickets</p>
          <p className="mt-1 text-slate-300">
            Track a ticket to unlock live pace, kill-risk cues, and cashout context in one strip.
          </p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <Link
              href={appendQuery(nervous.toHref('/slip'), {})}
              className="ui-button ui-button-primary min-h-0 px-3 py-1.5"
            >
              Track a ticket
            </Link>
            <Link
              href={appendQuery(nervous.toHref('/today'), {})}
              className="ui-button ui-button-ghost min-h-0 px-3 py-1.5"
            >
              Build from Board
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap gap-2 text-xs" data-testid="exposure-row">
            {exposure.byGame.map((item) => (
              <span key={item} className="rounded-full border border-white/15 px-2 py-1">
                {item}
              </span>
            ))}
            <span className="rounded-full border border-amber-300/30 px-2 py-1">
              High variance legs: {exposure.highVarianceLegs}
            </span>
            {(exposure.overlaps.length > 0 ? exposure.overlaps : ['No repeated players']).map(
              (item) => (
                <span key={item} className="rounded-full border border-cyan-300/30 px-2 py-1">
                  {item}
                </span>
              )
            )}
          </div>

          <ul className="mt-3 space-y-3">
            {tickets.slice(0, 5).map((ticket, index) => {
              const isExpanded = !!expanded[ticket.ticketId];
              const command = deriveLiveCommandSurface(ticket);
              return (
                <li
                  key={ticket.ticketId}
                  className="row-shell space-y-2"
                  data-testid={`ticket-${index + 1}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">
                        Live ticket command center
                      </p>
                      <p className="text-sm font-medium">{ticket.title}</p>
                      <p className="mt-1 text-xs text-slate-300">
                        <span className="mono-number">{ticket.odds}</span> ·{' '}
                        <span className="mono-number">{ticket.wager}</span> · {ticket.onPaceCount}/
                        {ticket.legs.length} legs carrying
                      </p>
                    </div>
                    <div className="rounded-xl border border-cyan-300/30 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100">
                      <div className="font-semibold">
                        Ticket pressure: {command?.ticketPressure.label ?? 'Stable'}
                      </div>
                      <div className="mt-1 max-w-xs text-cyan-50/90">
                        {command?.ticketPressure.detail ?? 'Ticket is waiting for more separation.'}
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-2 md:grid-cols-3">
                    <article className="rounded-lg border border-emerald-400/20 bg-emerald-500/5 p-3 text-xs">
                      <p className="uppercase tracking-[0.18em] text-emerald-200/80">
                        Strongest leg
                      </p>
                      <p className="mt-2 font-semibold text-slate-100">
                        {command?.strongestLeg
                          ? `${command.strongestLeg.player} ${command.strongestLeg.marketLabel} — ${command.strongestLeg.status}`
                          : 'Waiting for a carrying leg'}
                      </p>
                      <p className="mt-1 text-slate-300">
                        {command?.strongestLeg?.why ?? 'The ticket has not separated yet.'}
                      </p>
                    </article>
                    <article className="rounded-lg border border-rose-400/20 bg-rose-500/5 p-3 text-xs">
                      <p className="uppercase tracking-[0.18em] text-rose-200/80">Weakest leg</p>
                      <p className="mt-2 font-semibold text-slate-100">
                        {command?.weakestLeg
                          ? `${command.weakestLeg.player} ${command.weakestLeg.marketLabel} — ${command.weakestLeg.status}`
                          : 'Waiting for a weak spot'}
                      </p>
                      <p className="mt-1 text-slate-300">
                        {command?.primaryFailurePoint ?? 'No failure point identified yet.'}
                      </p>
                    </article>
                    <article className="rounded-lg border border-white/10 bg-slate-950/60 p-3 text-xs">
                      <p className="uppercase tracking-[0.18em] text-slate-400">What to watch</p>
                      <p className="mt-2 font-semibold text-slate-100">
                        {command?.gameScript ?? 'Watch for the next meaningful swing.'}
                      </p>
                      <p className="mt-1 text-slate-300">
                        Cashout{' '}
                        {ticket.cashoutAvailable && typeof ticket.cashoutValue === 'number'
                          ? `$${ticket.cashoutValue.toFixed(2)}`
                          : 'unavailable'}
                      </p>
                    </article>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    {getLoopTrustBadges(ticket.provenance).map((badge) => (
                      <span
                        key={badge.label}
                        className="rounded-full border border-white/15 px-2 py-1"
                      >
                        {badge.label}
                      </span>
                    ))}
                    {command?.ticketPressure ? (
                      <span className="rounded-full border border-amber-300/30 bg-amber-500/10 px-2 py-1">
                        {command.ticketPressure.label}
                      </span>
                    ) : null}
                    {ticket.cashoutAvailable && typeof ticket.cashoutValue === 'number' ? (
                      <span className="rounded-full border border-emerald-300/30 bg-emerald-500/10 px-2 py-1">
                        ${ticket.cashoutValue.toFixed(2)} · Cashout available
                      </span>
                    ) : (
                      <span className="rounded-full border border-slate-300/40 bg-slate-500/10 px-2 py-1">
                        Cashout: unavailable
                      </span>
                    )}
                    {ticket.coverage.coverage !== 'full' ? (
                      <span
                        className="rounded-full border border-slate-300/40 bg-slate-500/10 px-2 py-1"
                        title={`${ticket.coverage.coveredLegs}/${ticket.coverage.totalLegs} legs covered`}
                      >
                        Partial live coverage
                      </span>
                    ) : null}
                  </div>

                  <DuringCoach ticket={ticket} compact={!sweatMode} />

                  <div className="mt-2 flex flex-wrap gap-2">
                    <Link
                      href={appendQuery(nervous.toHref('/track'), {
                        slip_id: ticket.slip_id,
                        trace_id: ticket.trace_id
                      })}
                      className="rounded border border-cyan-300/40 bg-cyan-500/10 px-2 py-1 text-xs text-cyan-100"
                    >
                      {command?.nextActionLabel ?? 'Continue tracking'}
                    </Link>
                    <button
                      type="button"
                      className="rounded border border-white/20 px-2 py-1 text-xs"
                      onClick={() => openSettle(ticket)}
                    >
                      Settle
                    </button>
                    {ticket.trace_id ? (
                      <Link
                        href={appendQuery(nervous.toHref('/review'), {
                          trace_id: ticket.trace_id,
                          slip_id: ticket.slip_id
                        })}
                        className="rounded border border-white/20 px-2 py-1 text-xs"
                      >
                        Open review
                      </Link>
                    ) : null}
                  </div>

                  {ticket.rawSlipText ? (
                    <details className="mt-2 text-xs text-slate-300">
                      <summary className="cursor-pointer">Slip details</summary>
                      <p className="mt-1 whitespace-pre-wrap">{ticket.rawSlipText}</p>
                    </details>
                  ) : null}

                  {sweatMode ? (
                    <button
                      type="button"
                      className="mt-2 text-xs text-cyan-200 underline"
                      onClick={() =>
                        setExpanded((prev) => ({ ...prev, [ticket.ticketId]: !isExpanded }))
                      }
                    >
                      {isExpanded ? 'Hide legs' : 'Expand legs'}
                    </button>
                  ) : null}

                  <div
                    className={`collapse-shell ${sweatMode && isExpanded ? 'collapse-shell-open mt-2' : ''}`}
                  >
                    <ul className="space-y-2 text-xs">
                      {ticket.legs.map((leg) => {
                        const commandLeg = command?.legs.find((item) => item.legId === leg.legId);
                        return (
                          <li key={leg.legId} className="rounded border border-slate-700 p-2">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p>
                                {leg.player} · {leg.marketType} {leg.currentValue.toFixed(1)}/
                                {leg.threshold}
                              </p>
                              <span
                                className={`rounded-full border px-2 py-0.5 ${
                                  liveStatusTone[commandLeg?.status ?? 'in progress'] ??
                                  liveStatusTone['in progress']
                                }`}
                              >
                                {commandLeg?.status ?? 'in progress'}
                              </span>
                            </div>
                            <p className="mt-1 text-slate-300">
                              {commandLeg?.progressLabel ??
                                `Pace proj: ${leg.paceProjection.toFixed(1)} · Remaining ${leg.requiredRemaining.toFixed(1)}`}
                            </p>
                            <p className="mt-1 text-slate-400">
                              {commandLeg?.why ?? 'Live status will update as the game moves.'}
                            </p>
                            <div className="mt-1 flex gap-2">
                              <span className="rounded border border-white/20 px-1.5 py-0.5">
                                {leg.volatility}
                              </span>
                              {leg.minutesRisk ? (
                                <span className="rounded border border-amber-300/30 px-1.5 py-0.5">
                                  Minutes risk (margin)
                                </span>
                              ) : null}
                              {leg.coverage.coverage === 'missing' ? (
                                <span className="rounded border border-slate-300/30 px-1.5 py-0.5 text-slate-300">
                                  {leg.coverage.reason ?? 'coverage unavailable'}
                                </span>
                              ) : null}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {activeSettleTicket ? (
        <div
          className="mt-4 rounded-lg border border-cyan-400/30 bg-slate-900/90 p-3"
          data-testid="settle-panel"
        >
          <p className="text-sm font-medium">Settle ticket: {activeSettleTicket.title}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            {(['won', 'lost', 'void', 'unknown'] as TicketSettlementStatus[]).map((option) => (
              <button
                key={option}
                type="button"
                className={`rounded border px-2 py-1 ${settlementStatus === option ? 'border-cyan-300 bg-cyan-500/15' : 'border-white/20'}`}
                onClick={() => setSettlementStatus(option)}
              >
                {option}
              </button>
            ))}
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {activeSettleTicket.legs.map((leg) => (
              <label key={leg.legId} className="text-xs text-slate-200">
                {leg.player} {leg.marketType} (line {leg.threshold})
                <input
                  aria-label={`final-${leg.legId}`}
                  className="mt-1 w-full rounded border border-white/20 bg-slate-950 px-2 py-1"
                  value={finalValues[leg.legId] ?? ''}
                  onChange={(event) =>
                    setFinalValues((prev) => ({ ...prev, [leg.legId]: event.target.value }))
                  }
                />
              </label>
            ))}
          </div>
          <label className="mt-2 block text-xs text-slate-200">
            Final cashout taken (optional)
            <input
              aria-label="cashout-taken"
              className="mt-1 w-full rounded border border-white/20 bg-slate-950 px-2 py-1"
              value={cashoutTaken}
              onChange={(event) => setCashoutTaken(event.target.value)}
            />
          </label>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className="rounded border border-cyan-400/70 bg-cyan-500/10 px-3 py-1 text-xs"
              onClick={onSaveSettlement}
            >
              Save postmortem
            </button>
            <button
              type="button"
              className="rounded border border-white/20 px-3 py-1 text-xs"
              onClick={() => setSettleTicketId(null)}
            >
              Cancel
            </button>
            {activeSettleTicket?.trace_id ? (
              <Link
                href={appendQuery(nervous.toHref('/review'), {
                  trace_id: activeSettleTicket.trace_id,
                  slip_id: activeSettleTicket.slip_id
                })}
                className="rounded border border-white/20 px-3 py-1 text-xs"
              >
                Open review
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </CardSurface>
  );
}

export type { OpenTicket };
