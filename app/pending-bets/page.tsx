'use client';

import { useEffect, useState } from 'react';

type HistoricalBet = { id: string; slipText: string; outcome: 'win' | 'loss'; placedAt: string; closingLine?: string };

export default function PendingBetsPage() {
  const [bets, setBets] = useState<HistoricalBet[]>([]);
  const [slipText, setSlipText] = useState('');
  const [outcome, setOutcome] = useState<'win' | 'loss'>('loss');
  const [closingLine, setClosingLine] = useState('');

  const load = () => fetch('/api/history-bets').then((res) => res.json()).then((data) => setBets(data.bets as HistoricalBet[]));

  useEffect(() => { load(); }, []);

  const save = async () => {
    await fetch('/api/history-bets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slipText, outcome, closingLine }) });
    setSlipText('');
    setClosingLine('');
    load();
  };

  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-semibold">Historical Bets + Post-mortem</h1>
      <div className="bettor-card p-4 space-y-2">
        <textarea value={slipText} onChange={(event) => setSlipText(event.target.value)} placeholder="Paste prior slip/parlay" className="h-24 w-full rounded-lg border border-white/10 bg-slate-950/60 p-2 text-sm" />
        <div className="flex flex-wrap gap-2">
          <input value={closingLine} onChange={(event) => setClosingLine(event.target.value)} placeholder="Closing line (optional)" className="rounded border border-white/10 bg-slate-950/60 px-2 py-1 text-sm" />
          <select value={outcome} onChange={(event) => setOutcome(event.target.value as 'win' | 'loss')} className="rounded border border-white/10 bg-slate-950/60 px-2 py-1 text-sm"><option value="win">Win</option><option value="loss">Loss</option></select>
          <button type="button" onClick={() => void save()} className="rounded bg-cyan-400 px-3 py-1 text-sm font-medium text-slate-950">Save</button>
        </div>
      </div>
      <div className="space-y-2">
        {bets.map((bet) => (
          <article key={bet.id} className="bettor-card p-4">
            <p className="text-sm text-slate-200 whitespace-pre-wrap">{bet.slipText}</p>
            <p className="mt-2 text-xs text-slate-400">Outcome: {bet.outcome} • Placed: {new Date(bet.placedAt).toLocaleString()}</p>
            <p className="mt-2 text-sm text-slate-300">Post-mortem: We would flag high-variance legs first and compare against actual result. Misses may come from late injuries, line movement, or role change.</p>
          </article>
        ))}
      </div>
    </section>
  );
}
