'use client';

import { useState } from 'react';

import type { PostmortemRecord } from '@/src/core/review/types';

const tone: Record<PostmortemRecord['status'], string> = {
  won: 'border-emerald-300/30 bg-emerald-500/10',
  lost: 'border-amber-300/30 bg-amber-500/10',
  void: 'border-slate-300/30 bg-slate-600/10',
  unknown: 'border-slate-300/30 bg-slate-600/10'
};

export function PostmortemList({ records }: { records: PostmortemRecord[] }) {
  const [open, setOpen] = useState<Record<string, boolean>>({});

  return (
    <section className="rounded-xl border border-slate-700 bg-slate-900/70 p-4" data-testid="postmortem-list">
      <h2 className="text-lg font-semibold">Recent Postmortems</h2>
      <ul className="mt-3 space-y-2 text-sm">
        {records.slice(0, 10).map((record) => {
          const missed = record.legs.filter((leg) => !leg.hit);
          const killer = missed[0]?.missTags[0] ?? 'clean_clear';
          const isOpen = !!open[record.ticketId];
          return (
            <li key={record.ticketId} className="rounded border border-slate-700 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full border px-2 py-0.5 text-xs uppercase ${tone[record.status]}`}>{record.status}</span>
                <span className="text-xs">{killer}</span>
                <span className="text-xs">{record.legs.length} legs</span>
                <span className="text-xs">{missed.length} missed</span>
              </div>
              <ul className="mt-1 list-disc pl-5 text-xs text-slate-300">
                {record.narrative.slice(0, 3).map((line) => <li key={`${record.ticketId}-${line}`}>{line}</li>)}
              </ul>
              <button type="button" className="mt-2 text-xs underline" onClick={() => setOpen((prev) => ({ ...prev, [record.ticketId]: !isOpen }))}>{isOpen ? 'Hide details' : 'Open details'}</button>
              {isOpen ? (
                <table className="mt-2 w-full text-left text-xs">
                  <thead>
                    <tr>
                      <th>Leg</th><th>Target</th><th>Final</th><th>Delta</th><th>Tags</th>
                    </tr>
                  </thead>
                  <tbody>
                    {record.legs.map((leg) => (
                      <tr key={leg.legId}>
                        <td>{leg.player}</td>
                        <td>{leg.target}</td>
                        <td>{leg.finalValue}</td>
                        <td>{leg.delta.toFixed(1)}</td>
                        <td>{leg.missTags.join(', ') || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
