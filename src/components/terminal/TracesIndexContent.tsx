'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { PageHeader } from './PageHeader';
import { EmptyStateCard } from '../shared/EmptyStateCard';

export function TracesIndexContent() {
  const searchParams = useSearchParams();
  const [traceId, setTraceId] = useState('');
  const [recentTraceId, setRecentTraceId] = useState('');

  useEffect(() => {
    const fromQuery = searchParams.get('trace_id') ?? '';
    const fromStorage = typeof window !== 'undefined' ? window.localStorage.getItem('rb-last-trace-id') ?? '' : '';
    setRecentTraceId(fromQuery || fromStorage);
  }, [searchParams]);

  useEffect(() => {
    if (traceId && typeof window !== 'undefined') window.localStorage.setItem('rb-last-trace-id', traceId);
  }, [traceId]);

  const openHref = useMemo(() => (traceId ? `/traces/${encodeURIComponent(traceId)}` : '/traces'), [traceId]);

  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) setTraceId(text.trim());
    } catch {
      // browser permission denied/noop
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Traces" subtitle="Open a trace to inspect event and agent telemetry." />
      <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
        <div className="flex flex-wrap gap-2">
          <input
            value={traceId}
            onChange={(event) => setTraceId(event.target.value)}
            placeholder="Enter trace id"
            className="min-w-[260px] flex-1 rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          />
          <button type="button" onClick={() => void pasteFromClipboard()} className="rounded border border-slate-600 px-3 py-2 text-xs">Paste from clipboard</button>
          <Link href={openHref} className="rounded bg-cyan-700 px-3 py-2 text-sm">Open trace</Link>
        </div>
        {!traceId ? (
          <div className="mt-3 space-y-2">
            <EmptyStateCard
              title="No trace selected"
              guidance="Paste trace id from Research → Copy Trace, or open your recent trace below."
              primaryCta={recentTraceId ? { label: 'Open most recent trace', href: `/traces/${encodeURIComponent(recentTraceId)}` } : undefined}
              secondaryCta={{ label: 'Go to Research', href: '/research' }}
            />
            <p className="text-xs text-slate-500">Helper: use the Copy Trace button in Research header, then click Paste from clipboard.</p>
          </div>
        ) : null}
      </section>
    </div>
  );
}
