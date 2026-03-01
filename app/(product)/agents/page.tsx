const AGENTS = [
  { name: 'Injury Insider', does: 'Keeps player availability current so props only use active players.', asks: ['Who became active in the last hour?', 'Any late scratches that change usage?'] },
  { name: 'Line Sensei', does: 'Tracks line movement and market consensus shifts.', asks: ['Where is this line drifting?', 'Is this price getting steamed?'] },
  { name: 'Trend Rider', does: 'Summarizes last-5/last-10 performance context.', asks: ['How has this player done in the last 5?', 'Is this trend stable or noisy?'] },
  { name: 'Matchup Sniper', does: 'Explains opponent and pace context in plain terms.', asks: ['How does this defense handle this role?', 'Any pace mismatch here?'] },
  { name: 'Prop Finder', does: 'Scans active slates for high-probability prop angles.', asks: ['What are the strongest active-game props?', 'Which props have strong hit rates today?'] },
  { name: 'Coach Talk', does: 'Translates role and rotation notes for bettors.', asks: ['Any minutes cap risk?', 'Did rotation changes affect role?'] }
];

export default function AgentsPage() {
  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-semibold">Agents Directory</h1>
      <p className="text-sm text-slate-300">Premium assistant roster in bettor language. Research guidance only.</p>
      <div className="grid gap-3 md:grid-cols-2">
        {AGENTS.map((agent) => (
          <article key={agent.name} className="bettor-card p-4">
            <h2 className="text-xl font-semibold">{agent.name}</h2>
            <p className="mt-1 text-sm text-slate-300">{agent.does}</p>
            <p className="mt-3 text-xs uppercase tracking-wide text-slate-400">Ask this agent</p>
            <div className="mt-2 flex flex-wrap gap-2">{agent.asks.map((ask) => <button key={ask} type="button" className="rounded-lg border border-white/15 px-2 py-1 text-xs">{ask}</button>)}</div>
          </article>
        ))}
      </div>
    </section>
  );
}
