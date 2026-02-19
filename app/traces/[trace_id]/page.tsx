'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { EmptyState, InlineError, SkeletonBlock } from '@/src/components/terminal/AsyncState';
import { PageHeader } from '@/src/components/terminal/PageHeader';
import { RightRailInspector } from '@/src/components/terminal/RightRailInspector';
import { TraceBadge } from '@/src/components/terminal/TrustPrimitives';
import { useTraceEvents } from '@/src/hooks/useTraceEvents';

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

export default function TraceDetailPage({ params }: { params: { trace_id: string } }) {
  const traceId = params.trace_id;
  const { events, loading, error, refresh } = useTraceEvents({ traceId, limit: 250, enabled: true });
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [eventName, setEventName] = useState('all');
  const [agentId, setAgentId] = useState('all');
  const [errorsOnly, setErrorsOnly] = useState(false);

  const eventNames = useMemo(() => ['all', ...Array.from(new Set(events.map((event) => event.event_name)))], [events]);
  const agentIds = useMemo(
    () => ['all', ...Array.from(new Set(events.map((event) => String(asRecord(event.payload).agent_id ?? 'unknown'))))],
    [events]
  );

  const filtered = useMemo(
    () =>
      events.filter((event) => {
        const payload = asRecord(event.payload);
        const matchesEvent = eventName === 'all' || event.event_name === eventName;
        const currentAgent = String(payload.agent_id ?? 'unknown');
        const matchesAgent = agentId === 'all' || currentAgent === agentId;
        const isError = event.event_name.toLowerCase().includes('error') || Boolean(payload.error);
        return matchesEvent && matchesAgent && (!errorsOnly || isError);
      }),
    [agentId, errorsOnly, eventName, events]
  );

  const latest = filtered.at(-1);
  const selected = selectedIdx === null ? null : filtered[selectedIdx] ?? null;

  const summary = useMemo(() => {
    const assumptions = new Set<string>();
    const sources = new Set<string>();
    const agents = new Map<string, { id: string; snippet: string; timestamp?: string }>();
    let confidence: number | null = null;
    let updatedAt: string | undefined;

    for (const event of filtered) {
      const payload = asRecord(event.payload);
      const assumed = payload.assumptions;
      if (Array.isArray(assumed)) assumed.forEach((item) => assumptions.add(String(item)));
      const sourceList = payload.sources;
      if (Array.isArray(sourceList)) sourceList.forEach((item) => sources.add(String(item)));
      const maybeConfidence = payload.confidence;
      if (typeof maybeConfidence === 'number') confidence = maybeConfidence;
      const agent = typeof payload.agent_id === 'string' ? payload.agent_id : undefined;
      if (agent) {
        agents.set(agent, {
          id: agent,
          snippet: JSON.stringify(payload, null, 2).slice(0, 600),
          timestamp: event.created_at,
        });
      }
      updatedAt = event.created_at ?? updatedAt;
    }

    return {
      confidence,
      assumptions: [...assumptions],
      sources: [...sources],
      agents: [...agents.values()],
      updatedAt,
      provenance: filtered.length > 0 ? ('Live' as const) : ('Demo' as const),
    };
  }, [filtered]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Run Trace"
        subtitle="Inspect event tape, provenance, and agent activity."
        actions={<TraceBadge traceId={traceId} />}
        breadcrumbs={<Link href="/traces">Traces</Link>}
      />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_330px]">
        <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="mb-3 flex flex-wrap gap-2 text-xs">
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
          </div>

          {loading ? <SkeletonBlock className="h-40" /> : null}
          {error ? <InlineError message="Trace events unavailable" details={error} onRetry={() => void refresh()} /> : null}
          {!loading && !error && filtered.length === 0 ? (
            <EmptyState title="No events found" description="No telemetry events matched your filters for this trace." />
          ) : null}

          {filtered.length > 0 ? (
            <ul className="space-y-2 text-xs">
              {filtered.map((event, idx) => {
                const payload = asRecord(event.payload);
                return (
                  <li key={`${event.event_name}-${event.created_at ?? idx}`} className="grid grid-cols-[120px_1fr_110px_80px_60px] items-center gap-2 rounded border border-slate-800 bg-slate-950/60 px-2 py-1.5">
                    <span className="text-slate-400">{event.created_at ? new Date(event.created_at).toLocaleTimeString() : 'N/A'}</span>
                    <span>{event.event_name}</span>
                    <span>{String(payload.agent_id ?? '—')}</span>
                    <span>{typeof payload.confidence === 'number' ? payload.confidence.toFixed(2) : '—'}</span>
                    <button type="button" onClick={() => setSelectedIdx(idx)} className="rounded border border-slate-700 px-1 py-0.5">View</button>
                  </li>
                );
              })}
            </ul>
          ) : null}

          {selected ? (
            <div className="mt-3 rounded border border-slate-700 bg-slate-950 p-3 text-xs">
              <div className="mb-2 flex justify-between">
                <strong>{selected.event_name}</strong>
                <button onClick={() => setSelectedIdx(null)} type="button" className="rounded border border-slate-700 px-1.5 py-0.5">Close</button>
              </div>
              <pre className="max-h-64 overflow-auto">{JSON.stringify(selected, null, 2)}</pre>
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
    </div>
  );
}
