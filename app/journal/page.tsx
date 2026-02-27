'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { listJournalEntries } from '@/src/core/journal/storage';
import type { JournalEntry } from '@/src/core/journal/journalTypes';

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);

  useEffect(() => {
    setEntries(listJournalEntries());
  }, []);

  return (
    <section className="mx-auto max-w-4xl space-y-3 pb-20">
      <h1 className="text-3xl font-semibold">Betting Journal</h1>
      {entries.length === 0 ? <p className="text-sm text-slate-400">No entries yet. Save one from Track mode.</p> : null}
      {entries.map((entry) => (
        <article key={entry.entryId} className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 text-sm">
          <p className="text-xs text-slate-400">{new Date(entry.createdAtIso).toLocaleString()}</p>
          <p className="mt-1 font-medium">{entry.status.toUpperCase()} · {entry.slipId}</p>
          <p className="mt-1 text-slate-300">Hits: {entry.whatHit.length} · Misses: {entry.whatMissed.length} · Runbacks: {entry.runbackCandidates.length}</p>
          <Link className="mt-2 inline-block text-xs underline" href={`/journal/${entry.entryId}`}>View details</Link>
        </article>
      ))}
    </section>
  );
}
