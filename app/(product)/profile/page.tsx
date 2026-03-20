'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { appendQuery } from '@/src/components/landing/navigation';
import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';

type SummaryPayload = Awaited<ReturnType<typeof fetch>> extends never ? never : {
  snapshot: { profile: { display_name: string | null; username: string | null; bettor_identity: string | null }; credibility: { label: string; detail: string }; mode: 'live' | 'demo' };
  performance: { netResult: number; totalStaked: number; totalReturned: number; roiPct: number; betCount: number; winCount: number; winRatePct: number };
  weekly: Array<{ week: string; netResult: number; cumulativeNet: number }>;
  byMarket: Array<{ label: string; winRatePct: number; roiPct: number; betCount: number }>;
  bySlipSize: Array<{ label: string; winRatePct: number; roiPct: number; betCount: number }>;
  bySportsbook: Array<{ label: string; winRatePct: number; roiPct: number; betCount: number }>;
  heatmap: Array<{ day: string; count: number }>;
  advisorySignals: Array<{ label: string; severity: string; detail: string }>;
};

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

export default function ProfilePage() {
  const nervous = useNervousSystem();
  const [payload, setPayload] = useState<SummaryPayload | null>(null);

  useEffect(() => {
    void fetch('/api/bettor-memory/summary', { cache: 'no-store' }).then((res) => res.json()).then(setPayload);
  }, []);

  const hero = payload?.performance;

  return (
    <section className="mx-auto max-w-6xl space-y-4 py-4 pb-24">
      <header className="space-y-2 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
        <p className="text-xs uppercase tracking-[0.24em] text-cyan-300">Performance intelligence</p>
        <h1 className="text-3xl font-semibold text-slate-100">{payload?.snapshot.profile.display_name ?? payload?.snapshot.profile.username ?? 'Bettor profile'}</h1>
        <p className="text-sm text-slate-300">Persistent bettor memory for uploads, parsed slips, settled reviews, and repeat patterns.</p>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-slate-300">
          <p className="font-medium text-slate-100">{payload?.snapshot.credibility.label ?? 'Loading credibility...'}</p>
          <p className="mt-1">{payload?.snapshot.credibility.detail ?? 'Loading bettor memory basis.'}</p>
        </div>
      </header>

      <div className="grid gap-3 md:grid-cols-4">
        {[
          ['Net result', hero ? currency.format(hero.netResult) : '—'],
          ['Total staked', hero ? currency.format(hero.totalStaked) : '—'],
          ['Total returned', hero ? currency.format(hero.totalReturned) : '—'],
          ['ROI', hero ? `${hero.roiPct}%` : '—'],
          ['Bet count', hero ? String(hero.betCount) : '—'],
          ['Win count', hero ? String(hero.winCount) : '—'],
          ['Win rate', hero ? `${hero.winRatePct}%` : '—'],
          ['Identity', payload?.snapshot.profile.bettor_identity?.replace(/_/g, ' ') ?? '—'],
        ].map(([label, value]) => (
          <article key={label} className="rounded-xl border border-white/10 bg-slate-950/50 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
            <p className="mt-2 text-xl font-semibold text-slate-100">{value}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
          <h2 className="text-lg font-semibold text-slate-100">Weekly trend</h2>
          <div className="mt-3 space-y-2 text-sm text-slate-300">
            {(payload?.weekly ?? []).map((row) => (
              <div key={row.week} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                <span>{row.week}</span>
                <span>Net {currency.format(row.netResult)} · Cumulative {currency.format(row.cumulativeNet)}</span>
              </div>
            ))}
            {payload?.weekly?.length === 0 ? <p>No settled history yet.</p> : null}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
          <h2 className="text-lg font-semibold text-slate-100">Discipline / risk</h2>
          <div className="mt-3 space-y-2">
            {(payload?.advisorySignals ?? []).map((signal) => (
              <div key={signal.label} className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-slate-300">
                <p className="font-medium text-slate-100">{signal.label}</p>
                <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">{signal.severity}</p>
                <p className="mt-2 text-xs">{signal.detail}</p>
              </div>
            ))}
            {payload?.advisorySignals?.length === 0 ? <p className="text-sm text-slate-400">No deterministic risk flags yet.</p> : null}
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {([
          { title: 'Category performance', rows: payload?.byMarket ?? [] },
          { title: 'Slip size performance', rows: payload?.bySlipSize ?? [] },
          { title: 'Sportsbook split', rows: payload?.bySportsbook ?? [] },
        ]).map(({ title, rows }) => (
          <section key={title} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
            <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
            <div className="mt-3 space-y-2 text-sm text-slate-300">
              {(rows as SummaryPayload['byMarket']).map((row) => (
                <div key={row.label} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                  <p className="font-medium text-slate-100">{row.label}</p>
                  <p className="text-xs">{row.betCount} tracked slips · {row.winRatePct}% hit rate · {row.roiPct}% ROI</p>
                </div>
              ))}
              {(rows as SummaryPayload['byMarket']).length === 0 ? <p className="text-sm text-slate-400">No rows yet.</p> : null}
            </div>
          </section>
        ))}
      </div>

      <section className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
        <h2 className="text-lg font-semibold text-slate-100">Activity heatmap</h2>
        <div className="mt-3 grid gap-2 md:grid-cols-7">
          {(payload?.heatmap ?? []).map((cell) => (
            <div key={cell.day} className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-slate-300">
              <p className="font-medium text-slate-100">{cell.day}</p>
              <p>{cell.count} saved slips</p>
            </div>
          ))}
          {payload?.heatmap?.length === 0 ? <p className="text-sm text-slate-400">No activity captured yet.</p> : null}
        </div>
      </section>

      <div className="fixed bottom-0 left-0 right-0 border-t border-white/10 bg-slate-950/95 p-3">
        <div className="mx-auto flex max-w-6xl gap-2">
          <Link className="flex-1 rounded bg-cyan-400 px-3 py-2 text-center text-sm font-semibold text-slate-950" href={appendQuery(nervous.toHref('/ingest'), { source: 'performance' })}>Upload screenshot</Link>
          <Link className="flex-1 rounded border border-white/20 px-3 py-2 text-center text-sm" href={appendQuery(nervous.toHref('/history'), {})}>Open archive</Link>
        </div>
      </div>
    </section>
  );
}
