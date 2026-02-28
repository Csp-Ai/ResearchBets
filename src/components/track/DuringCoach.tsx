'use client';

import { useMemo, useState } from 'react';

import { computeDuringCoach } from '@/src/core/live/duringCoach';
import type { OpenTicket } from '@/src/core/live/openTickets';
import { saveDraftPostmortem } from '@/src/core/review/store';

const statusTone = {
  ahead: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100',
  on_pace: 'border-cyan-400/40 bg-cyan-500/10 text-cyan-100',
  behind: 'border-amber-400/40 bg-amber-500/10 text-amber-100',
  needs_spike: 'border-rose-400/40 bg-rose-500/10 text-rose-100'
} as const;

export function DuringCoach({ ticket, compact = false }: { ticket: OpenTicket; compact?: boolean }) {
  const coach = useMemo(() => computeDuringCoach(ticket), [ticket]);
  const [showWhy, setShowWhy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const closest = coach.nextToHit[0];
  const topKillReason = coach.killRiskReasonChips[0] ?? 'Monitoring variance';

  const handleSave = () => {
    saveDraftPostmortem({
      ticketId: ticket.ticketId,
      savedAt: new Date().toISOString(),
      killLeg: `${coach.killRisk.player} ${coach.killRisk.marketType}`,
      reasons: coach.killRiskReasonChips.slice(0, 3),
      fragilityScore: coach.killRiskFragility.fragilityScore,
      coverageSummary: `${ticket.coverage.coverage}:${ticket.coverage.coveredLegs}/${ticket.coverage.totalLegs}`
    });
    setToast('Saved for postmortem');
    window.setTimeout(() => setToast(null), 1500);
  };

  if (compact) {
    return (
      <div className="mt-2 rounded-md border border-slate-700/80 bg-slate-950/50 p-2 text-xs" data-testid="during-coach-compact">
        <p className="text-slate-200">Closest: {closest ? `${closest.player} ${closest.marketType} (needs ${closest.requiredRemaining.toFixed(1)})` : '—'}</p>
        <p className="mt-1 text-slate-200">Kill risk: {coach.killRisk.player} {coach.killRisk.marketType} <span className="ml-1 rounded-full border border-white/20 px-1.5 py-0.5">{topKillReason}</span></p>
        <p className="mt-1 text-slate-300">Cashout: {ticket.cashoutAvailable && typeof ticket.cashoutValue === 'number' ? `$${ticket.cashoutValue.toFixed(2)}` : 'unknown'}</p>
        <details className="mt-2 text-slate-300">
          <summary className="cursor-pointer">Save for postmortem</summary>
          <button type="button" onClick={handleSave} className="mt-1 rounded border border-white/20 px-2 py-0.5">Save for postmortem</button>
        </details>
        {toast ? <p className="mt-1 text-emerald-200">{toast}</p> : null}
      </div>
    );
  }

  return (
    <div className="mt-2 rounded-md border border-slate-700/80 bg-slate-950/50 p-2 text-xs" data-testid="during-coach-panel">
      <p className="font-medium text-slate-100">DURING Coach</p>

      <div className="mt-2">
        <p className="text-slate-300">Next to hit</p>
        <ul className="mt-1 space-y-1">
          {coach.nextToHit.map((leg) => (
            <li key={`${ticket.ticketId}-${leg.legId}`} className="rounded border border-slate-700 p-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p>{leg.player}: {leg.currentValue.toFixed(1)} / {leg.threshold.toFixed(1)} (remaining {leg.requiredRemaining.toFixed(1)})</p>
                <span className={`rounded-full border px-2 py-0.5 ${statusTone[leg.status]}`}>{leg.status.replace('_', ' ')}</span>
              </div>
              <p className="mt-1 text-slate-300">Volatility: {leg.volatility}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-2">
        <p className="text-slate-300">Kill risk</p>
        <div className="mt-1 rounded border border-slate-700 p-2">
          <p>{coach.killRisk.player}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {coach.killRiskReasonChips.map((chip) => (
              <span key={`${coach.killRisk.legId}-${chip}`} className="rounded-full border border-white/20 px-1.5 py-0.5">{chip}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-2">
        <p className="text-slate-300">Suggested actions</p>
        <ul className="mt-1 space-y-1">
          {coach.actions.map((action) => (
            <li key={`${ticket.ticketId}-${action.kind}`} className="rounded border border-slate-700 p-2">
              <p className="font-medium text-slate-100">{action.label.toUpperCase()}</p>
              {action.details ? <p className="mt-1 text-slate-300">{action.details}</p> : null}
            </li>
          ))}
        </ul>
      </div>

      <details className="mt-2 text-slate-300">
        <summary className="cursor-pointer">Save for postmortem</summary>
        <button type="button" onClick={handleSave} className="mt-1 rounded border border-white/20 px-2 py-0.5">Save for postmortem</button>
      </details>
      {toast ? <p className="mt-1 text-emerald-200">{toast}</p> : null}

      <div className="mt-2">
        <button type="button" className="text-slate-300 underline" onClick={() => setShowWhy((value) => !value)}>
          Why
        </button>
        {showWhy ? (
          <ul className="mt-1 list-disc pl-5 text-slate-300">
            {coach.explanation.map((rule) => <li key={`${ticket.ticketId}-${rule}`}>{rule}</li>)}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
