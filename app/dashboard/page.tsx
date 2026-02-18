'use client';

import { useEffect, useState } from 'react';

export default function DashboardPage() {
  const [summary, setSummary] = useState<{ roi: number; profit: number; winRate: number; avgOdds: number; byBucket: Record<string, unknown>; insights: string[] } | null>(null);

  useEffect(() => {
    fetch('/api/dashboard/summary').then((res) => res.json()).then(setSummary);
  }, []);

  return (
    <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-6">
      <h1 className="text-2xl font-semibold">Performance Dashboard</h1>
      <p className="text-sm text-slate-400">ROI {summary?.roi ?? 0}% · Profit ${summary?.profit ?? 0} · Win Rate {summary?.winRate ?? 0}% · Avg Odds {summary?.avgOdds ?? 0}</p>
      <pre className="overflow-auto rounded bg-slate-950 p-3 text-xs">{JSON.stringify(summary?.byBucket ?? {}, null, 2)}</pre>
      <div>
        <h2 className="text-lg font-medium">Insights</h2>
        <ul className="list-disc pl-5 text-sm">
          {(summary?.insights ?? []).map((insight: string) => (
            <li key={insight}>{insight}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
