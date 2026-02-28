'use client';

import { useMemo, useState } from 'react';

import { computeDuringCoach } from '@/src/core/live/duringCoach';
import type { OpenTicket } from '@/src/core/live/openTickets';
import { saveDraftPostmortem } from '@/src/core/review/store';
import { Badge } from '@/src/components/ui/Badge';
import { CardSurface } from '@/src/components/ui/CardSurface';

export function DuringCoach({ ticket, compact = false }: { ticket: OpenTicket; compact?: boolean }) {
  const coach = useMemo(() => computeDuringCoach(ticket), [ticket]);
  const [showWhy, setShowWhy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const closest = coach.nextToHit[0];

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
    return <div className="mt-2 text-xs text-slate-300" data-testid="during-coach-compact">Closest: {closest?.player ?? '—'} · Kill risk: {coach.killRisk.player} · Cashout: {ticket.cashoutAvailable ? `$${ticket.cashoutValue?.toFixed(2)}` : 'unknown'}</div>;
  }

  return (
    <div className="mt-2 space-y-3" data-testid="during-coach-panel">
      <div className="grid gap-3 md:grid-cols-3">
        <CardSurface className="p-3">
          <p className="text-xs text-emerald-300">Closest</p>
          <p className="mt-1 text-sm font-semibold text-slate-100">{closest ? `${closest.player} ${closest.marketType}` : 'No active leg'}</p>
          {closest ? <p className="text-xs text-slate-300">Needs {closest.requiredRemaining.toFixed(1)} more</p> : null}
        </CardSurface>
        <CardSurface className="p-3">
          <p className="text-xs text-rose-300">Kill Risk</p>
          <p className="mt-1 text-sm font-semibold text-slate-100">{coach.killRisk.player}</p>
          <div className="mt-1 flex flex-wrap gap-1">{coach.killRiskReasonChips.slice(0, 2).map((chip) => <Badge key={`${coach.killRisk.legId}-${chip}`} variant="danger">{chip}</Badge>)}</div>
        </CardSurface>
        <CardSurface className="p-3">
          <p className="text-xs text-cyan-300">Cashout</p>
          <p className="mt-1 text-sm font-semibold text-slate-100">{ticket.cashoutAvailable && typeof ticket.cashoutValue === 'number' ? `$${ticket.cashoutValue.toFixed(2)}` : 'Unavailable'}</p>
          <p className="text-xs text-slate-300">{coach.actions[0]?.label ?? 'Monitor pace'}</p>
        </CardSurface>
      </div>

      <p className="text-xs text-slate-400">Suggested actions</p>
      <details className="rounded-lg bg-black/20 px-3 py-2 text-slate-300">
        <summary className="cursor-pointer text-xs">More details</summary>
        <ul className="mt-2 list-disc pl-5 text-xs">{coach.explanation.map((rule) => <li key={`${ticket.ticketId}-${rule}`}>{rule}</li>)}</ul>
      </details>

      <button type="button" onClick={handleSave} className="rounded-lg bg-[#00E5C8] px-3 py-2 text-xs font-semibold text-slate-950">Save for postmortem</button>
      {toast ? <p className="text-xs text-emerald-200">{toast}</p> : null}
      <button type="button" className="text-xs text-slate-400 underline" onClick={() => setShowWhy((value) => !value)}>Why</button>
      {showWhy ? <ul className="list-disc pl-5 text-xs text-slate-400">{coach.actions.map((action) => <li key={`${ticket.ticketId}-${action.kind}`}>{action.label}</li>)}</ul> : null}
    </div>
  );
}
