'use client';

import { BetSlipIngestionForm } from '@/features/betslip/components/BetSlipIngestionForm';
import { DashboardOverview } from '@/features/research/components/DashboardOverview';
import { useBetTracker } from '@/features/tracker/state/useBetTracker';

export function BetTrackerShell() {
  const { bets, settleBet } = useBetTracker();

  return (
    <div className="space-y-6">
      <DashboardOverview bets={bets} />
      <BetSlipIngestionForm />
      <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-xl font-semibold">Tracked Bets</h2>
        <ul className="mt-4 space-y-3">
          {bets.map((bet) => (
            <li className="rounded-lg border border-slate-800 bg-slate-950 p-4" key={bet.id}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium">{bet.selection}</p>
                  <p className="text-sm text-slate-400">
                    {bet.sport} · {bet.market} ·{' '}
                    {bet.oddsAmerican > 0 ? `+${bet.oddsAmerican}` : bet.oddsAmerican}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">Status: {bet.status}</p>
                </div>
                {bet.status === 'open' ? (
                  <button
                    className="rounded-md border border-emerald-600 px-3 py-1 text-xs text-emerald-300 hover:bg-emerald-600/10"
                    onClick={() =>
                      settleBet({
                        id: bet.id,
                        outcome: 'won',
                        settledAt: new Date().toISOString()
                      })
                    }
                    type="button"
                  >
                    Mark Won
                  </button>
                ) : null}
              </div>
            </li>
          ))}
          {bets.length === 0 ? (
            <li className="text-sm text-slate-400">No bets tracked yet.</li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}
