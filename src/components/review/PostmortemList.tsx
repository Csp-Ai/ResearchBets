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
      <ul className="mt-3 space-y-2 text-sm">
        {records.slice(0, 10).map((record) => {
          const missed = record.legs.filter((leg) => !leg.hit);
          const killer = missed[0]?.missTags[0] ?? 'clean_clear';
          const isOpen = !!open[record.ticketId];
          const missedBy = missed[0]?.delta ?? 0;
          return (
            <li key={record.ticketId} className="rounded-lg bg-black/20 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={record.status === 'won' ? 'success' : record.status === 'lost' ? 'danger' : 'neutral'}>{record.status.toUpperCase()}</Badge>
                <span className="text-xs text-slate-300">{killer}</span>
                <span className="text-xs text-amber-100">Missed by {Math.abs(missedBy).toFixed(1)}</span>
              </div>
              <button type="button" className="mt-2 text-xs text-cyan-200 underline" onClick={() => setOpen((prev) => ({ ...prev, [record.ticketId]: !isOpen }))}>{isOpen ? 'Hide detail' : 'Expand detail'}</button>
              {isOpen ? (
                <ul className="mt-2 space-y-1 text-xs text-slate-300">
                  {record.legs.map((leg) => <li key={leg.legId}>{leg.player} · target {leg.target} · final {leg.finalValue} · tags {leg.missTags.join(', ') || '—'}</li>)}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
    </CardSurface>
  );
}
