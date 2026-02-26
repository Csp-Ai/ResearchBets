'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { appendQuery } from '@/src/components/landing/navigation';
import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';
import { Button } from '@/src/components/ui/button';

type SlipRow = {
  id: string;
  source_type: 'self' | 'shared';
  title: string;
  created_at: string;
  settlement: { status: string; settled_at?: string | null; pnl?: number | null } | null;
};

export default function HistoryPage() {
  const [slips, setSlips] = useState<SlipRow[]>([]);
  const [workingSlipId, setWorkingSlipId] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const nervous = useNervousSystem();

  const load = async () => {
    const response = await fetch('/api/history-bets', { cache: 'no-store' });
    const payload = await response.json();
    setSlips(payload.slips ?? []);
  };

  useEffect(() => {
    void load();
  }, []);

  const runSettle = async (slipId: string) => {
    setWorkingSlipId(slipId);
    const response = await fetch('/api/history-bets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slip_id: slipId, mode: nervous.mode === 'live' ? 'live' : 'demo' }),
    });
    const payload = await response.json();
    setBanner(payload.banner ?? (response.ok ? 'Settlement complete.' : payload.error ?? 'Settlement unavailable right now.'));
    setWorkingSlipId(null);
    await load();
  };

  const badge = (status?: string) => {
    if (status === 'settled') return 'Settled';
    if (status === 'partial') return 'Needs review';
    return 'Pending settle';
  };

  return (
    <section className="mx-auto max-w-2xl space-y-4 py-4 pb-24">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Recent uploads</h1>
        <p className="text-sm text-slate-300">Track old slips, settle outcomes, and keep notes in one place.</p>
      </header>
      {banner ? <p className="rounded border border-white/15 bg-white/5 px-3 py-2 text-xs text-slate-200">{banner}</p> : null}
      <div className="space-y-2">
        {slips.map((slip) => (
          <article key={slip.id} className="rounded-xl border border-white/15 bg-slate-950/50 p-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-medium text-slate-100">{slip.title}</h2>
              <span className="rounded bg-white/10 px-2 py-1 text-[10px] uppercase tracking-wide text-slate-200">{badge(slip.settlement?.status)}</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">{slip.source_type === 'shared' ? 'Shared slip/text' : 'My slip'} • {new Date(slip.created_at).toLocaleString()}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button intent="secondary" onClick={() => void runSettle(slip.id)} disabled={workingSlipId === slip.id}>{workingSlipId === slip.id ? 'Settling…' : 'Run settle'}</Button>
              <Link className="rounded border border-white/15 px-3 py-2 text-xs" href={appendQuery(nervous.toHref('/slip'), { id: slip.id })}>Open slip</Link>
            </div>
          </article>
        ))}
        {slips.length === 0 ? <p className="text-sm text-slate-400">No uploads yet. Start with “Upload slip”.</p> : null}
      </div>
      <div className="fixed bottom-0 left-0 right-0 border-t border-white/10 bg-slate-950/95 p-3">
        <div className="mx-auto flex max-w-2xl gap-2">
          <Link className="flex-1 rounded bg-cyan-400 px-3 py-2 text-center text-sm font-semibold text-slate-950" href={appendQuery(nervous.toHref('/ingest'), { source: 'history_cta' })}>Upload slip</Link>
          <Link className="flex-1 rounded border border-white/20 px-3 py-2 text-center text-sm" href={appendQuery(nervous.toHref('/today'), { tab: 'board' })}>Build from Board</Link>
        </div>
      </div>
    </section>
  );
}
