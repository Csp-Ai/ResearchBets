import React from 'react';

const chips = [
  'Works with FanDuel',
  'Works with PrizePicks',
  'Works with Kalshi',
  'Anonymous-first',
  'Demo always available',
  'No picks. No locks.'
];

export function ProofStrip() {
  return (
    <section aria-label="proof-strip" className="rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        {chips.map((chip) => (
          <span key={chip} className="rounded-full border border-slate-700 bg-slate-950/50 px-2 py-1 text-[11px] text-slate-300">
            {chip}
          </span>
        ))}
      </div>
    </section>
  );
}
