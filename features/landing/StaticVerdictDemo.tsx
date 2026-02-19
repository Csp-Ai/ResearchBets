import { ExampleVerdictBlock } from '@/src/components/landing/ExampleVerdictBlock';

export function StaticVerdictDemo() {
  return (
    <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/70 p-5">
      <div>
        <p className="text-xs uppercase tracking-wide text-cyan-300">What we show you</p>
        <h2 className="mt-1 text-lg font-semibold">Real output, instantly understandable</h2>
      </div>

      <div className="rounded border border-slate-800 bg-slate-950/60 p-4">
        <p className="text-xs uppercase tracking-wide text-slate-400">Example ticket</p>
        <p className="mt-1 text-sm text-slate-200">Luka 30+ pts · LeBron 6+ ast · KAT 2+ threes</p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full border border-amber-400/50 bg-amber-400/15 px-2 py-1 text-amber-200">
            MODIFY
          </span>
          <span className="rounded-full border border-rose-400/40 bg-rose-400/10 px-2 py-1 text-rose-200">
            Weakest leg: KAT 2+ threes
          </span>
          <span className="rounded-full border border-cyan-400/40 bg-cyan-400/10 px-2 py-1 text-cyan-200">
            Confidence: 64%
          </span>
          <span className="rounded-full border border-slate-600 px-2 py-1 text-slate-300">
            Risk: Medium
          </span>
        </div>
        <ul className="mt-3 list-disc pl-4 text-xs text-slate-400">
          <li>Volatility elevated in recent 3PT attempts profile.</li>
          <li>Matchup pace lowers clean shot volume.</li>
          <li>Injury/rotation uncertainty raises variance.</li>
        </ul>
      </div>

      <div>
        <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">Example Verdict</p>
        <ExampleVerdictBlock />
      </div>
    </section>
  );
}
