'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { PageHeader } from './PageHeader';
import { EmptyStateCard } from '../shared/EmptyStateCard';
import { emitCopyToast } from './copyToast';

type ApiEvent = { trace_id?: string; created_at?: string; timestamp?: string; event_name?: string; payload?: Record<string, unknown> };
type RecentTraceRow = { traceId: string; updatedAt?: string; status: 'running' | 'complete' | 'stale' };

function inferStatus(event?: ApiEvent): 'running' | 'complete' | 'stale' {
  if (!event) return 'stale';
  const name = String(event.event_name ?? '').toLowerCase();
  if (name.includes('complete') || name.includes('finished') || name.includes('saved')) return 'complete';
  const updatedAt = new Date(event.created_at ?? event.timestamp ?? 0).getTime();
  if (Number.isFinite(updatedAt) && Date.now() - updatedAt <= 3 * 60 * 1000) return 'running';
  return 'stale';
}

function shortTraceId(traceId: string): string {
  if (traceId.length <= 14) return traceId;
  return `${traceId.slice(0, 8)}…${traceId.slice(-4)}`;
}

export function TracesIndexContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [traceId, setTraceId] = useState('');
  const [recentTraceId, setRecentTraceId] = useState('');
  const [recentRows, setRecentRows] = useState<RecentTraceRow[]>([]);

  useEffect(() => {
    const fromQuery = searchParams.get('trace_id') ?? '';
    const fromStorage = typeof window !== 'undefined' ? window.localStorage.getItem('rb-last-trace-id') ?? '' : '';
    setRecentTraceId(fromQuery || fromStorage);
  }, [searchParams]);

  useEffect(() => {
    const loadRecents = async () => {
      if (typeof window === 'undefined') return;
      const fromQuery = searchParams.get('trace_id') ?? '';
      const fromLast = window.localStorage.getItem('rb-last-trace-id') ?? '';
      const fromList = JSON.parse(window.localStorage.getItem('rb-recent-trace-ids') ?? '[]') as string[];
      const fallback = [fromQuery, fromLast, ...fromList].filter(Boolean);

      try {
        const res = await fetch('/api/events?limit=200');
        if (!res.ok) throw new Error('events list unavailable');
        const payload = (await res.json()) as { events?: ApiEvent[] };
        const events = payload.events ?? [];
        const byTrace = new Map<string, ApiEvent>();
        for (const event of events) {
          const id = String(event.trace_id ?? '');
          if (!id) continue;
          const current = byTrace.get(id);
          const currentTime = new Date(current?.created_at ?? current?.timestamp ?? 0).getTime();
          const nextTime = new Date(event.created_at ?? event.timestamp ?? 0).getTime();
          if (!current || nextTime > currentTime) byTrace.set(id, event);
        }
        const rows = [...byTrace.entries()].slice(0, 10).map(([id, event]) => ({ traceId: id, updatedAt: event.created_at ?? event.timestamp, status: inferStatus(event) }));
        setRecentRows(rows);
      } catch {
        const rows = Array.from(new Set(fallback)).slice(0, 10).map((id) => ({ traceId: id, status: 'stale' as const }));
        setRecentRows(rows);
      }
    };
    void loadRecents();
  }, [searchParams]);

  useEffect(() => {
    if (traceId && typeof window !== 'undefined') {
      window.localStorage.setItem('rb-last-trace-id', traceId);
      const current = JSON.parse(window.localStorage.getItem('rb-recent-trace-ids') ?? '[]') as string[];
      const next = [traceId, ...current.filter((value) => value !== traceId)].slice(0, 10);
      window.localStorage.setItem('rb-recent-trace-ids', JSON.stringify(next));
    }
  }, [traceId]);

  const openHref = useMemo(() => (traceId ? `/traces/${encodeURIComponent(traceId)}` : '/traces'), [traceId]);

  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const clean = text.trim();
      if (clean) {
        setTraceId(clean);
        emitCopyToast('Trace id pasted.');
      }
    } catch {
      emitCopyToast('Unable to paste trace id.');
    }
  };

  const openRow = (id: string) => {
    setTraceId(id);
    router.push(`/traces/${encodeURIComponent(id)}`);
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
          <Link href={openHref} className="rounded bg-cyan-700 px-3 py-2 text-sm">Open trace</Link>
          <button type="button" onClick={() => void pasteFromClipboard()} className="rounded border border-slate-600 px-3 py-2 text-xs">Paste from clipboard</button>
        </div>
        <div className="mt-4 rounded border border-slate-800 bg-slate-950/60 p-3">
          <h3 className="text-sm font-semibold text-slate-100">Recent traces</h3>
          {recentRows.length === 0 ? <p className="mt-2 text-xs text-slate-400">No recent traces yet.</p> : (
            <ul className="mt-2 space-y-2 text-xs">
              {recentRows.map((row) => (
                <li key={row.traceId}>
                  <button type="button" onClick={() => openRow(row.traceId)} className="flex w-full items-center justify-between rounded border border-slate-800 px-2 py-1.5 text-left hover:border-cyan-500/60">
                    <span className="text-slate-200">{shortTraceId(row.traceId)}</span>
                    <span className="text-slate-400">{row.status} · {row.updatedAt ? new Date(row.updatedAt).toLocaleString() : 'n/a'}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {!traceId ? (
          <div className="mt-3 space-y-2">
            <EmptyStateCard
              title="No trace selected"
              guidance="Paste trace id from Research → Copy Trace, or open your recent trace below."
              primaryCta={recentTraceId ? { label: 'Open most recent trace', href: `/traces/${encodeURIComponent(recentTraceId)}` } : undefined}
              secondaryCta={{ label: 'Go to Research', href: '/research' }}
            />
          </div>
        ) : null}
      </section>
    </div>
  );
}
