'use client';

import { useState } from 'react';

import type { PostmortemRecord } from '@/src/core/review/types';
import { Badge } from '@/src/components/ui/Badge';
import { CardSurface } from '@/src/components/ui/CardSurface';
import { Button } from '@/src/components/ui/button';
import { saveGuardrail } from '@/src/core/guardrails/localGuardrails';

export function PostmortemList({ records }: { records: PostmortemRecord[] }) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [appliedByTicket, setAppliedByTicket] = useState<Record<string, boolean>>({});

  return (
    <CardSurface className="p-4" data-testid="postmortem-list">
      <h2 className="text-lg font-semibold text-slate-100">Recent Postmortems</h2>
      <p className="panel-subtitle mt-1">Status, killer tag, and miss distance at a glance.</p>
      <ul className="mt-3 space-y-2 text-sm">
        {records.slice(0, 10).map((record) => {
          const missed = record.legs.filter((leg) => !leg.hit);
          const killer = missed[0]?.missTags[0] ?? 'clean_clear';
          const isOpen = !!open[record.ticketId];
          const missedBy = missed[0]?.delta ?? 0;
          return (
            <li key={record.ticketId} className="row-shell">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={record.status === 'won' ? 'success' : record.status === 'lost' ? 'danger' : 'neutral'}>{record.status.toUpperCase()}</Badge>
                <span className="text-xs text-slate-300">{killer}</span>
                <span className="mono-number text-xs text-amber-100">Gap {Math.abs(missedBy).toFixed(1)}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                <span className="rounded-full border border-cyan-300/30 bg-cyan-500/10 px-2 py-1 text-cyan-100">Lesson: {killer.replaceAll('_', ' ')}</span>
                <span className="rounded-full border border-amber-300/30 bg-amber-500/10 px-2 py-1 text-amber-100">Next time: {record.nextTimeRule?.title ?? 'Keep sizing disciplined'}</span>
              </div>
              <button type="button" className={`disclosure-button mt-2 ${isOpen ? 'disclosure-open' : ''}`} onClick={() => setOpen((prev) => ({ ...prev, [record.ticketId]: !isOpen }))}><span>{isOpen ? 'Hide detail' : 'Expand detail'}</span><span className="disclosure-caret">⌄</span></button>
              {isOpen ? (
                <div className="mt-2 space-y-2">
                  <div className="overflow-hidden rounded-md border border-white/10">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-900/70 text-slate-400">
                        <tr><th className="px-2 py-1">Leg</th><th className="px-2 py-1">Target</th><th className="px-2 py-1">Final</th><th className="px-2 py-1">Delta</th><th className="px-2 py-1">Tags</th></tr>
                      </thead>
                      <tbody>
                        {record.legs.map((leg) => <tr key={leg.legId} className="border-t border-white/10"><td className="px-2 py-1">{leg.player}</td><td className="mono-number px-2 py-1">{leg.target}</td><td className="mono-number px-2 py-1">{leg.finalValue ?? '—'}</td><td className="mono-number px-2 py-1">{leg.delta.toFixed(1)}</td><td className="px-2 py-1">{leg.missTags.join(', ') || '—'}</td></tr>)}
                      </tbody>
                    </table>
                  </div>
                  {record.nextTimeRule ? (
                    <div className="rounded-md border border-cyan-400/30 bg-cyan-400/10 p-2" data-testid="next-time-card">
                      <p className="text-xs font-semibold text-cyan-100">Next Time: {record.nextTimeRule.title}</p>
                      <p className="mt-1 text-xs text-slate-200">{record.nextTimeRule.body}</p>
                      <Button
                        intent="secondary"
                        className="mt-2 min-h-0 px-2 py-1 text-xs"
                        onClick={() => {
                          saveGuardrail(record.nextTimeRule!);
                          setAppliedByTicket((prev) => ({ ...prev, [record.ticketId]: true }));
                        }}
                      >
                        {appliedByTicket[record.ticketId] ? 'Guardrail applied ✓' : 'Apply as Guardrail'}
                      </Button>
                      {appliedByTicket[record.ticketId] ? <p className="mt-1 text-xs text-emerald-200">Saved to your local guardrails.</p> : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </CardSurface>
  );
}
