const does = [
  'Shows per-leg confidence, volatility, and evidence links.',
  'Keeps decision flow traceable: slip → insight → snapshot → evidence.',
  'Starts anonymous-first; no login required for basic research.'
];

const doesnt = ['Guarantee winnings.', 'Sell picks or place bets for you.', 'Share your slip text publicly by default.'];

export function Credibility() {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
      <h2 className="text-lg font-semibold">What ResearchBets does (and doesn&apos;t)</h2>
      <div className="mt-3 grid gap-4 md:grid-cols-2 text-sm">
        <div>
          <p className="font-medium text-cyan-200">Does</p>
          <ul className="mt-2 space-y-2 text-slate-300">{does.map((point) => <li key={point}>✅ {point}</li>)}</ul>
        </div>
        <div>
          <p className="font-medium text-amber-200">Doesn&apos;t</p>
          <ul className="mt-2 space-y-2 text-slate-300">{doesnt.map((point) => <li key={point}>⛔ {point}</li>)}</ul>
        </div>
      </div>
      <p className="mt-4 text-xs text-slate-400">Privacy-first default: only required Supabase keys in local env; service role stays server-only.</p>
    </section>
  );
}
