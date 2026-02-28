'use client';

import { useState } from 'react';

import type { PostmortemRecord } from '@/src/core/review/types';
import { Badge } from '@/src/components/ui/Badge';
import { CardSurface } from '@/src/components/ui/CardSurface';

export function PostmortemList({ records }: { records: PostmortemRecord[] }) {
  const [open, setOpen] = useState<Record<string, boolean>>({});

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
                <span className="mono-number text-xs text-amber-100">Missed by {Math.abs(missedBy).toFixed(1)}</span>
              </div>
              <button type="button" className="mt-2 text-xs text-cyan-200 underline" onClick={() => setOpen((prev) => ({ ...prev, [record.ticketId]: !isOpen }))}>{isOpen ? 'Hide detail' : 'Expand detail'}</button>
              {isOpen ? (
                <div className="mt-2 overflow-hidden rounded-md border border-white/10">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-900/70 text-slate-400">
                      <tr><th className="px-2 py-1">Leg</th><th className="px-2 py-1">Target</th><th className="px-2 py-1">Final</th><th className="px-2 py-1">Tags</th></tr>
                    </thead>
                    <tbody>
                      {record.legs.map((leg) => <tr key={leg.legId} className="border-t border-white/10"><td className="px-2 py-1">{leg.player}</td><td className="mono-number px-2 py-1">{leg.target}</td><td className="mono-number px-2 py-1">{leg.finalValue ?? '—'}</td><td className="px-2 py-1">{leg.missTags.join(', ') || '—'}</td></tr>)}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </CardSurface>
  );
}
