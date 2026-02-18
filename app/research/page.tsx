'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { AgentNodeGraph, type ControlPlaneEvent } from '@/src/components/AgentNodeGraph';
import { createClientRequestId, ensureAnonSessionId } from '@/src/core/identifiers/session';

export default function ResearchPage() {
  const search = useSearchParams();
  const snapshotId = search.get('snapshotId') ?? '';
  const traceId = search.get('trace_id') ?? '';
  const [status, setStatus] = useState('');
  const [advancedView, setAdvancedView] = useState(false);
  const [graphEvents, setGraphEvents] = useState<ControlPlaneEvent[]>([]);

  useEffect(() => {
    if (!traceId) return;
    fetch(`/api/events?trace_id=${traceId}&limit=20`)
      .then((res) => res.json())
      .then((payload: { events: Array<Record<string, unknown>> }) => {
        const normalized = (payload.events ?? []).map((event) => ({
          event_name: String(event.event_name ?? ''),
          trace_id: String(event.trace_id ?? ''),
          request_id: String(event.request_id ?? ''),
          created_at: String(event.timestamp ?? ''),
          payload: (event.properties as Record<string, unknown>) ?? {},
        }));
        setGraphEvents(normalized);
      });
  }, [traceId]);

  const submit = async (formData: FormData) => {
    const anonSessionId = ensureAnonSessionId();
    const bet = {
      sessionId: anonSessionId,
      userId: anonSessionId,
      snapshotId,
      traceId: traceId || createClientRequestId(),
      runId: createClientRequestId(),
      selection: formData.get('selection')?.toString() ?? 'Unknown',
      odds: Number(formData.get('odds') ?? 1.91),
      stake: Number(formData.get('stake') ?? 100),
      confidence: Number(formData.get('confidence') ?? 0.65),
      idempotencyKey: createClientRequestId(),
    };

    const response = await fetch('/api/bets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bet),
    });

    setStatus(response.ok ? 'Bet logged for analysis.' : 'Failed to log bet.');
  };

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      <h1 className="text-2xl font-semibold">Log Research Outcome</h1>
      <p className="text-sm text-slate-400">Snapshot: {snapshotId || 'Not started'} · Trace: {traceId || 'Pending'}</p>
      <div className="mt-3">
        <button type="button" onClick={() => setAdvancedView((current) => !current)} className="rounded border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-cyan-400/70" aria-pressed={advancedView}>
          {advancedView ? 'Hide Advanced View' : 'Advanced View'}
        </button>
      </div>
      <form action={submit} className="mt-4 grid gap-3 text-sm">
        <input className="rounded bg-slate-950 p-2" name="selection" placeholder="Selection" defaultValue="BOS -3.5" />
        <input className="rounded bg-slate-950 p-2" name="odds" placeholder="Decimal odds" defaultValue="1.91" />
        <input className="rounded bg-slate-950 p-2" name="stake" placeholder="Stake" defaultValue="100" />
        <input className="rounded bg-slate-950 p-2" name="confidence" placeholder="Confidence" defaultValue="0.68" />
        <button type="submit" className="rounded bg-sky-600 px-3 py-2 font-medium">Save outcome</button>
      </form>
      <p className="mt-2 text-xs text-slate-400">{status}</p>
      {advancedView ? (
        <div className="mt-5">
          <AgentNodeGraph traceId={traceId || 'research-trace'} events={graphEvents} />
        </div>
      ) : null}
    </section>
  );
}
