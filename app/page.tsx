import Link from 'next/link';

import { ExampleVerdictBlock } from '@/src/components/landing/ExampleVerdictBlock';

export default function HomePage() {
  return (
    <main className="space-y-6">
      <section className="rounded-xl border border-slate-800 bg-slate-900/90 p-8">
        <p className="text-xs uppercase tracking-wide text-cyan-300">Bettor Mode</p>
        <h1 className="mt-2 text-4xl font-semibold">Paste a slip → get a verdict + weakest leg in seconds</h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-300">
          ResearchBets turns your parlay into a clear decision plan with confidence, risk flags, and edit suggestions.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/ingest" className="rounded bg-cyan-600 px-4 py-2 text-sm font-medium">Paste Slip</Link>
          <Link href="/research?demo=1" className="rounded border border-slate-600 px-4 py-2 text-sm">See Demo Verdict</Link>
        </div>
      </section>

      <section className="grid gap-3 rounded-xl border border-slate-800 bg-slate-900/80 p-5 md:grid-cols-3">
        <article className="rounded border border-slate-800 bg-slate-950/70 p-3"><p className="text-xs text-cyan-300">Step 1</p><p className="mt-1 text-sm font-medium">Paste slip</p><p className="mt-1 text-xs text-slate-400">Drop in text or upload and extract legs.</p></article>
        <article className="rounded border border-slate-800 bg-slate-950/70 p-3"><p className="text-xs text-cyan-300">Step 2</p><p className="mt-1 text-sm font-medium">Fix slip</p><p className="mt-1 text-xs text-slate-400">See weakest leg, risk flags, and suggested edits fast.</p></article>
        <article className="rounded border border-slate-800 bg-slate-950/70 p-3"><p className="text-xs text-cyan-300">Step 3</p><p className="mt-1 text-sm font-medium">Track results</p><p className="mt-1 text-xs text-slate-400">Rerun research and log outcomes with trace transparency.</p></article>
      </section>

      <ExampleVerdictBlock />

      <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
        <h2 className="text-lg font-semibold">Built for prop bettors & parlays</h2>
        <p className="mt-1 text-sm text-slate-300">Fast verdicts, clear reasons, and advanced trace details when you need to inspect.</p>
      </section>
    </main>
  );
}
