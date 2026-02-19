import Link from 'next/link';

export function LandingHero() {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/90 p-8">
      <p className="text-xs uppercase tracking-wide text-cyan-300">Bettor Mode</p>
      <h1 className="mt-2 text-4xl font-semibold">
        Upload a Parlay. Find the Weakest Leg in Seconds.
      </h1>
      <p className="mt-3 max-w-2xl text-sm text-slate-300">
        Built for prop bettors. Research-backed insights, risk flags, and fix suggestions.
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          href="/ingest"
          className="rounded bg-cyan-600 px-4 py-2 text-sm font-medium text-slate-950"
        >
          Paste Slip
        </Link>
        <Link
          href="/research?snapshot=demo"
          className="rounded border border-slate-600 px-4 py-2 text-sm"
        >
          Try Demo Verdict
        </Link>
      </div>
    </section>
  );
}
