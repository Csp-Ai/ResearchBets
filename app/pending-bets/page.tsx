'use client';

import { useEffect, useState } from 'react';

type Bet = { id: string; selection: string; status: 'pending' | 'settled' };

export default function PendingBetsPage() {
  const [bets, setBets] = useState<Bet[]>([]);

  const load = () => fetch('/api/bets?status=pending').then((res) => res.json()).then((data) => setBets(data.bets));

  useEffect(() => {
    load();
  }, []);

  const settle = async (id: string) => {
    await fetch(`/api/bets/${id}/settle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outcome: 'won' }),
    });
    load();
  };

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      <h1 className="text-2xl font-semibold">Pending Bets</h1>
      <ul className="mt-4 space-y-2 text-sm">
        {bets.map((bet) => (
          <li key={bet.id} className="flex items-center justify-between rounded border border-slate-700 p-2">
            <span>{bet.selection}</span>
            <button onClick={() => settle(bet.id)} className="rounded bg-emerald-700 px-2 py-1 text-xs">Settle</button>
          </li>
        ))}
        {bets.length === 0 ? <li className="text-slate-400">No pending bets.</li> : null}
      </ul>
    </section>
  );
}
