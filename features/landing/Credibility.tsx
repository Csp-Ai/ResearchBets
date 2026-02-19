const points = [
  'Built for prop bettors, not sportsbooks.',
  'Backtested leg insights with hit rate and volatility context.',
  'Transparent trace-driven research flow for inspection when needed.',
  'Not affiliated with FanDuel or PrizePicks.'
];

export function Credibility() {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
      <h2 className="text-lg font-semibold">Why it works</h2>
      <ul className="mt-3 space-y-2 text-sm text-slate-300">
        {points.map((point) => (
          <li key={point} className="flex gap-2">
            <span aria-hidden="true">✅</span>
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
