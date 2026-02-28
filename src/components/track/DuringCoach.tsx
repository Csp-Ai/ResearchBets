'use client';

import { useMemo, useState } from 'react';

import { computeDuringCoach } from '@/src/core/live/duringCoach';
import type { OpenTicket } from '@/src/core/live/openTickets';
import { saveDraftPostmortem } from '@/src/core/review/store';
import { Badge } from '@/src/components/ui/Badge';
import { CardSurface } from '@/src/components/ui/CardSurface';
import { Button } from '@/src/components/ui/button';

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
    return <div className="mt-2 text-xs text-slate-300" data-testid="during-coach-compact">Closest: {closest?.player ?? '—'} · Kill risk: {coach.killRisk.player} · Cashout: {ticket.cashoutAvailable ? `$${ticket.cashoutValue?.toFixed(2)}` : 'unavailable'}</div>;
  }

  return (
    <div className="mt-2 space-y-3" data-testid="during-coach-panel">
      <div className="grid gap-3 md:grid-cols-3">
        <CardSurface className="flex min-h-[108px] flex-col justify-between p-3">
          <p className="inline-flex items-center gap-1 text-xs text-emerald-300">Closest to hit</p>
          <p className="mt-1 text-sm font-semibold text-slate-100">{closest ? `${closest.player} ${closest.marketType}` : 'No active leg'}</p>
          {closest ? <Badge size="sm" variant="success">Remaining {closest.requiredRemaining.toFixed(1)}</Badge> : null}
        </CardSurface>
        <CardSurface className="flex min-h-[108px] flex-col justify-between p-3">
          <p className="inline-flex items-center gap-1 text-xs text-rose-300">Kill risk</p>
          <p className="mt-1 text-sm font-semibold text-slate-100">{coach.killRisk.player}</p>
          <div className="mt-1 flex flex-wrap gap-1">{coach.killRiskReasonChips.slice(0, 1).map((chip) => <Badge key={`${coach.killRisk.legId}-${chip}`} variant="danger" size="sm">{chip}</Badge>)}</div>
        </CardSurface>
        <CardSurface className="flex min-h-[108px] flex-col justify-between p-3">
          <p className="text-xs text-cyan-300">Cashout</p>
          <p className="mt-1 text-sm font-semibold text-slate-100">{ticket.cashoutAvailable && typeof ticket.cashoutValue === 'number' ? `$${ticket.cashoutValue.toFixed(2)}` : 'Unavailable'}</p>
          <Badge size="sm" variant="info">{coach.actions[0]?.label ?? 'Monitor pace'}</Badge>
        </CardSurface>
      </div>

      <p className="text-xs text-slate-400">Suggested actions</p>
      <details className="rounded-lg bg-black/20 px-3 py-2 text-slate-300">
        <summary className="cursor-pointer text-xs">Coach details</summary>
        <ul className="mt-2 list-disc pl-5 text-xs">{coach.explanation.map((rule) => <li key={`${ticket.ticketId}-${rule}`}>{rule}</li>)}</ul>
      </details>

      <Button type="button" intent="primary" onClick={handleSave} className="min-h-0 px-3 py-2 text-xs">Save for postmortem</Button>
      {toast ? <p className="text-xs text-emerald-200">{toast}</p> : null}
      <button type="button" className="text-xs text-slate-400 underline" onClick={() => setShowWhy((value) => !value)}>Why</button>
      {showWhy ? <ul className="list-disc pl-5 text-xs text-slate-400">{coach.actions.map((action) => <li key={`${ticket.ticketId}-${action.kind}`}>{action.label}</li>)}</ul> : null}
    </div>
  );
}
