'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { appendQuery } from '@/src/components/landing/navigation';
import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';
import { deriveRunHeader } from '@/src/core/ui/deriveTruth';

type DashboardSummary = {
  settledCount: number;
  pendingCount: number;
  roi: number;
  profit: number;
  winRate: number;
};

type EdgeReport = {
  delta?: { clv_line?: number };
  cohort_sizes?: { total?: number };
};

export default function DashboardPageClient() {
  const nervous = useNervousSystem();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [edge, setEdge] = useState<EdgeReport | null>(null);

  useEffect(() => {
    fetch(nervous.toHref('/api/dashboard/summary'), { cache: 'no-store' })
      .then((res) => res.json() as Promise<DashboardSummary>)
      .then(setSummary)
      .catch(() => setSummary(null));

    fetch(nervous.toHref('/api/edge/report'), { cache: 'no-store' })
      .then((res) => res.json() as Promise<EdgeReport>)
      .then(setEdge)
      .catch(() => setEdge(null));
  }, [nervous]);

  const runHeader = deriveRunHeader({ trace_id: nervous.trace_id, mode: nervous.mode });

  const continueHref = useMemo(() => {
    if ((summary?.pendingCount ?? 0) > 0) return appendQuery(nervous.toHref('/track'), { source: 'dashboard' });
    if ((summary?.settledCount ?? 0) > 0) return appendQuery(nervous.toHref('/slip'), { source: 'dashboard' });
    return appendQuery(nervous.toHref('/tonight'), { source: 'dashboard' });
  }, [nervous, summary?.pendingCount, summary?.settledCount]);

  return (
    <section className="grid gap-4 md:grid-cols-3">
      <article className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
        <h2 className="text-lg font-semibold">Latest Run</h2>
        <p className="mt-2 text-xs text-slate-300">trace_id: {runHeader.traceId}</p>
        <p className="text-xs text-slate-300">Mode: {runHeader.modeLabel}</p>
      </article>

      <article className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
        <h2 className="text-lg font-semibold">Last Tracked Slip</h2>
        <p className="mt-2 text-sm text-slate-200">Pending: {summary?.pendingCount ?? 0}</p>
        <p className="text-sm text-slate-200">Settled: {summary?.settledCount ?? 0}</p>
      </article>

      <article className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
        <h2 className="text-lg font-semibold">Edge Pulse</h2>
        <p className="mt-2 text-sm text-slate-200">CLV delta: {edge?.delta?.clv_line ?? 0}</p>
        <p className="text-sm text-slate-200">Cohort size: {edge?.cohort_sizes?.total ?? 0}</p>
      </article>

      <div className="md:col-span-3">
        <Link href={continueHref} className="inline-flex rounded bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950">Continue</Link>
      </div>
    </section>
  );
}
