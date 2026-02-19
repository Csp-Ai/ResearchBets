'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import type { ControlPlaneEvent } from '@/src/components/AgentNodeGraph';
import { EmptyState, InlineError, SkeletonBlock } from '@/src/components/terminal/AsyncState';
import { PageHeader } from '@/src/components/terminal/PageHeader';
import { RightRailInspector } from '@/src/components/terminal/RightRailInspector';
import { RunHeaderStrip } from '@/src/components/terminal/RunHeaderStrip';
import { asRecord, deriveInspectorSummary } from '@/src/components/terminal/eventDerivations';
import { useTraceEvents } from '@/src/hooks/useTraceEvents';
import { hasActiveTraceFilters } from '@/src/components/terminal/traceFilters';

function buildEventMeta(event: ControlPlaneEvent) {
  const payload = asRecord(event.payload);
  return {
    agentId: String(payload.agent_id ?? 'unknown'),
    confidence: typeof payload.confidence === 'number' ? payload.confidence : null,
    isError: event.event_name.toLowerCase().includes('error') || Boolean(payload.error),
  };
}

export default function TraceDetailPage({ params }: { params: { trace_id: string } }) {
  const traceId = params.trace_id;
  const query = useSearchParams();
  const initialErrorsOnly = query.get('errors') === '1';
  const initialEvent = query.get('event') ?? 'all';
  const initialAgent = query.get('agent') ?? 'all';

  const { events, loading, error, refresh } = useTraceEvents({ traceId, limit: 250, enabled: true });

  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [eventName, setEventName] = useState(initialEvent);
  const [agentId, setAgentId] = useState(initialAgent);
  const [errorsOnly, setErrorsOnly] = useState(initialErrorsOnly);
  const [groupByAgent, setGroupByAgent] = useState(false);

  const eventNames = useMemo(() => ['all', ...Array.from(new Set(events.map((event) => event.event_name)))], [events]);
  const agentIds = useMemo(
    () => ['all', ...Array.from(new Set(events.map((event) => buildEventMeta(event).agentId)))],
    [events]
  );

  useEffect(() => {
    if (!eventNames.includes(eventName)) setEventName('all');
  }, [eventName, eventNames]);

  useEffect(() => {
    if (!agentIds.includes(agentId)) setAgentId('all');
  }, [agentId, agentIds]);

  const filtered = useMemo(
    () =>
      events.filter((event) => {
        const meta = buildEventMeta(event);
        const matchesEvent = eventName === 'all' || event.event_name === eventName;
        const matchesAgent = agentId === 'all' || meta.agentId === agentId;
        return matchesEvent && matchesAgent && (!errorsOnly || meta.isError);
      }),
    [agentId, errorsOnly, eventName, events]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, ControlPlaneEvent[]>();
    for (const event of filtered) {
      const key = buildEventMeta(event).agentId;
      const existing = map.get(key) ?? [];
      existing.push(event);
      map.set(key, existing);
    }
    return [...map.entries()];
  }, [filtered]);

  const latest = filtered.at(-1);
  const selected = selectedIdx === null ? null : filtered[selectedIdx] ?? null;
  const summary = useMemo(() => deriveInspectorSummary(filtered), [filtered]);
  const hasActiveFilters = hasActiveTraceFilters(eventName, agentId, errorsOnly);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedIdx(null);
        return;
      }
      if (filtered.length === 0) return;
      if (event.key === 'j') {
        event.preventDefault();
        setSelectedIdx((current) => {
          if (current === null) return 0;
          return Math.min(filtered.length - 1, current + 1);
        });
      }
      if (event.key === 'k') {
        event.preventDefault();
        setSelectedIdx((current) => {
          if (current === null) return 0;
          return Math.max(0, current - 1);
        });
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        setSelectedIdx((current) => current ?? 0);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [filtered.length]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Run Trace"
        subtitle="Inspect event tape, provenance, and agent activity."
        breadcrumbs={<Link href="/traces">Traces</Link>}
      />

      <RunHeaderStrip traceId={traceId} events={events} onRefresh={() => void refresh()} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_330px]">
        <section id="event-tape" className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
          <div className="sticky top-2 z-10 mb-3 rounded border border-slate-800 bg-slate-950/95 p-2 text-xs backdrop-blur">
            <div className="flex flex-wrap items-center gap-2">
              <select value={eventName} onChange={(e) => setEventName(e.target.value)} className="rounded border border-slate-700 bg-slate-950 px-2 py-1">
                {eventNames.map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </select>
              <select value={agentId} onChange={(e) => setAgentId(e.target.value)} className="rounded border border-slate-700 bg-slate-950 px-2 py-1">
                {agentIds.map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </select>
              <label className="flex items-center gap-1 rounded border border-slate-700 px-2 py-1">
                <input type="checkbox" checked={errorsOnly} onChange={(e) => setErrorsOnly(e.target.checked)} /> errors only
              </label>
              <label className="flex items-center gap-1 rounded border border-slate-700 px-2 py-1">
                <input type="checkbox" checked={groupByAgent} onChange={(e) => setGroupByAgent(e.target.checked)} /> group by agent
              </label>
              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={() => {
                    setEventName('all');
                    setAgentId('all');
                    setErrorsOnly(false);
                  }}
                  className="rounded border border-amber-700/70 px-2 py-1 text-amber-200"
                >
                  Clear filters
                </button>
              ) : null}
            </div>
          </div>

          {loading ? <SkeletonBlock className="h-40" /> : null}
          {error ? <InlineError message="Trace events unavailable" details={error} onRetry={() => void refresh()} /> : null}
          {!loading && !error && filtered.length === 0 ? (
            <EmptyState title="No events found" description="No telemetry events matched your filters for this trace." />
          ) : null}

          {!groupByAgent && filtered.length > 0 ? (
            <ul className="space-y-1 text-xs">
              {filtered.map((event, idx) => {
                const meta = buildEventMeta(event);
                const active = selectedIdx === idx;
                return (
                  <li key={`${event.event_name}-${event.created_at ?? idx}`} className={`grid grid-cols-[96px_1fr_108px_66px_56px] items-center gap-2 rounded border px-2 py-1 ${active ? 'border-cyan-500/70 bg-cyan-950/20' : 'border-slate-800 bg-slate-950/60'}`}>
                    <span className="text-slate-400">{event.created_at ? new Date(event.created_at).toLocaleTimeString() : 'N/A'}</span>
                    <span className="truncate">{event.event_name}</span>
                    <span className="truncate">{meta.agentId}</span>
                    <span>{meta.confidence !== null ? meta.confidence.toFixed(2) : '—'}</span>
                    <button type="button" onClick={() => setSelectedIdx(idx)} className="rounded border border-slate-700 px-1 py-0.5">View</button>
                  </li>
                );
              })}
            </ul>
          ) : null}

          {groupByAgent ? (
            <div className="space-y-2 text-xs">
              {grouped.map(([groupAgent, items]) => (
                <details key={groupAgent} open className="rounded border border-slate-800 bg-slate-950/60 p-2">
                  <summary className="cursor-pointer font-medium">{groupAgent} · {items.length} events</summary>
                  <ul className="mt-2 space-y-1">
                    {items.map((event) => {
                      const idx = filtered.indexOf(event);
                      const meta = buildEventMeta(event);
                      return (
                        <li key={`${groupAgent}-${event.event_name}-${event.created_at ?? idx}`} className="grid grid-cols-[96px_1fr_66px_56px] items-center gap-2 rounded border border-slate-800 px-2 py-1">
                          <span className="text-slate-400">{event.created_at ? new Date(event.created_at).toLocaleTimeString() : 'N/A'}</span>
                          <span className="truncate">{event.event_name}</span>
                          <span>{meta.confidence !== null ? meta.confidence.toFixed(2) : '—'}</span>
                          <button type="button" onClick={() => setSelectedIdx(idx)} className="rounded border border-slate-700 px-1 py-0.5">View</button>
                        </li>
                      );
                    })}
                  </ul>
                </details>
              ))}
            </div>
          ) : null}
        </section>

        <RightRailInspector
          traceId={traceId}
          runId={latest?.request_id ? String(latest.request_id) : null}
          sessionId={null}
          loading={loading}
          error={error}
          summary={summary}
        />
      </div>

      {selected ? (
        <div className="fixed inset-y-0 right-0 z-30 w-full max-w-xl border-l border-slate-700 bg-slate-950/95 p-4 text-xs shadow-2xl">
          <div className="mb-3 flex items-center justify-between">
            <strong>{selected.event_name}</strong>
            <button onClick={() => setSelectedIdx(null)} type="button" className="rounded border border-slate-700 px-1.5 py-0.5">Close</button>
          </div>
          <div className="mb-3 space-y-1 rounded border border-slate-800 bg-slate-900/60 p-2">
            <p>timestamp: {selected.created_at ?? 'n/a'}</p>
            <p>agent: {buildEventMeta(selected).agentId}</p>
            <p>confidence: {buildEventMeta(selected).confidence ?? 'n/a'}</p>
          </div>
          <div className="mb-2 flex flex-wrap gap-2">
            <button type="button" onClick={() => void navigator.clipboard.writeText(JSON.stringify(selected, null, 2))} className="rounded border border-slate-700 px-2 py-1">Copy JSON</button>
            {selected.request_id ? <button type="button" onClick={() => void navigator.clipboard.writeText(String(selected.request_id))} className="rounded border border-slate-700 px-2 py-1">Copy request_id</button> : null}
            {typeof asRecord(selected.payload).run_id === 'string' ? <button type="button" onClick={() => void navigator.clipboard.writeText(String(asRecord(selected.payload).run_id))} className="rounded border border-slate-700 px-2 py-1">Copy run_id</button> : null}
            {typeof asRecord(selected.payload).session_id === 'string' ? <button type="button" onClick={() => void navigator.clipboard.writeText(String(asRecord(selected.payload).session_id))} className="rounded border border-slate-700 px-2 py-1">Copy session_id</button> : null}
          </div>
          <pre className="max-h-[70vh] overflow-auto rounded border border-slate-800 bg-slate-900/60 p-2">{JSON.stringify(selected, null, 2)}</pre>
        </div>
      ) : null}
    </div>
  );
}
