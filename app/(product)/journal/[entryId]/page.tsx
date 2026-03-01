'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { loadJournalEntry } from '@/src/core/journal/storage';
import type { JournalEntry } from '@/src/core/journal/journalTypes';

export default function JournalEntryPage() {
  const params = useParams<{ entryId: string }>();
  const [entry, setEntry] = useState<JournalEntry | null>(null);

  useEffect(() => {
    if (!params.entryId) return;
    setEntry(loadJournalEntry(params.entryId));
  }, [params.entryId]);

  if (!entry) return <section className="mx-auto max-w-4xl">Entry not found.</section>;

  return (
    <section className="mx-auto max-w-4xl space-y-3 pb-20">
      <h1 className="text-2xl font-semibold">Journal Entry</h1>
      <p className="text-sm text-slate-300">Slip {entry.slipId} · {entry.status}</p>
      <div className="rounded-lg border border-slate-700 p-3 text-sm">
        <p className="font-medium">What hit</p>
        <ul className="list-disc pl-5">{entry.whatHit.map((item) => <li key={item}>{item}</li>)}</ul>
      </div>
      <div className="rounded-lg border border-slate-700 p-3 text-sm">
        <p className="font-medium">What missed</p>
        <ul className="list-disc pl-5">{entry.whatMissed.map((item) => <li key={item}>{item}</li>)}</ul>
      </div>
      <div className="rounded-lg border border-slate-700 p-3 text-sm">
        <p className="font-medium">Notes</p>
        <ul className="list-disc pl-5">{entry.notes.map((item) => <li key={item}>{item}</li>)}</ul>
      </div>
    </section>
  );
}
