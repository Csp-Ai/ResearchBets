'use client';

import { useState } from 'react';

const ITEMS = [
  { id: 'during', title: 'During preview', body: 'Track signal drift and downside concentration while your run is active.' },
  { id: 'after', title: 'After preview', body: 'Review what broke and keep process notes for next slate.' },
  { id: 'how', title: 'How it works', body: 'Board → Ticket → Stress Test → Run Trace with deterministic demo fallback.' },
];

export function BelowFoldAccordions() {
  const [open, setOpen] = useState<string>('during');
  return (
    <section className="space-y-2 rounded-xl border border-white/10 bg-slate-900/40 p-3">
      {ITEMS.map((item) => (
        <div key={item.id}>
          <button className="min-h-11 w-full rounded border border-white/15 px-3 text-left text-sm text-slate-100" onClick={() => setOpen((v) => (v === item.id ? '' : item.id))}>{item.title}</button>
          {open === item.id ? <p className="px-2 pt-2 text-xs text-slate-300">{item.body}</p> : null}
        </div>
      ))}
    </section>
  );
}
