import React from 'react';
export function ExampleVerdictBlock() {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
      <p className="text-xs uppercase tracking-wide text-cyan-300">Example verdict</p>
      <h2 className="mt-1 text-lg font-semibold">MODIFY</h2>
      <p className="mt-1 text-sm text-slate-300">
        Weakest leg: K. Thompson 3PM over 3.5 (high volatility). Keep Luka 30+ points.
      </p>
      <ul className="mt-2 list-disc pl-4 text-xs text-slate-400">
        <li>Action: swap volatile 3PM leg for assists alt line.</li>
        <li>Confidence: 0.64 · Risk: Medium.</li>
      </ul>
    </section>
  );
}
