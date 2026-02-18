import type { Bet } from '@/entities/bet/model';

type DashboardOverviewProps = {
  bets: Bet[];
};

function calculateOpenCount(bets: Bet[]): number {
  return bets.filter((bet) => bet.status === 'open').length;
}

function calculateSettledCount(bets: Bet[]): number {
  return bets.filter((bet) => bet.status === 'settled').length;
}

function calculateRoiPercent(bets: Bet[]): number {
  const settledBets = bets.filter((bet) => bet.status === 'settled');
  const totalStaked = settledBets.reduce((sum, bet) => sum + bet.stake, 0);

  if (!totalStaked) {
    return 0;
  }

  const totalProfit = settledBets.reduce((sum, bet) => {
    if (bet.outcome === 'won') {
      return sum + (bet.potentialPayout - bet.stake);
    }

    if (bet.outcome === 'lost') {
      return sum - bet.stake;
    }

    return sum;
  }, 0);

  return (totalProfit / totalStaked) * 100;
}

export function DashboardOverview({ bets }: DashboardOverviewProps) {
  const openCount = calculateOpenCount(bets);
  const settledCount = calculateSettledCount(bets);
  const roiPercent = calculateRoiPercent(bets);

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      <h2 className="text-xl font-semibold">Research Terminal Snapshot</h2>
      <p className="mt-1 text-sm text-slate-400">Ingest → Validate → Track → Review → Insight</p>
      <dl className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
          <dt className="text-sm text-slate-400">Open Positions</dt>
          <dd className="text-2xl font-semibold">{openCount}</dd>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
          <dt className="text-sm text-slate-400">Settled Positions</dt>
          <dd className="text-2xl font-semibold">{settledCount}</dd>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
          <dt className="text-sm text-slate-400">ROI</dt>
          <dd className="text-2xl font-semibold">{roiPercent.toFixed(2)}%</dd>
        </div>
      </dl>
    </section>
  );
}
