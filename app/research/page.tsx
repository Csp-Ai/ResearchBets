'use client';

import { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

import {
  AgentNodeGraph,
  GRAPH_NODES,
  reconstructGraphState,
  type ControlPlaneEvent,
} from '@/src/components/AgentNodeGraph';
import { EvidenceDrawer } from '@/src/components/EvidenceDrawer';
import { TerminalLoopShell } from '@/src/components/TerminalLoopShell';
import { TraceReplayControls } from '@/src/components/TraceReplayControls';
import { createClientRequestId, ensureAnonSessionId } from '@/src/core/identifiers/session';
import { useTraceEvents } from '@/src/hooks/useTraceEvents';

function toProgressTimestamp(events: ControlPlaneEvent[], progress: number): number {
  if (events.length === 0) return Date.now();
  const sorted = [...events].sort((a, b) => new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime());
  const start = new Date(sorted[0]?.created_at ?? 0).getTime();
  const end = new Date(sorted.at(-1)?.created_at ?? 0).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || start === end) return end || Date.now();
  return start + ((end - start) * progress) / 100;
}

export default function ResearchPage() {
  const search = useSearchParams();
  const snapshotId = search.get('snapshotId') ?? '';
  const traceId = search.get('trace_id') ?? '';
  const replayMode = search.get('replay') === '1';
  const [status, setStatus] = useState('');
  const [advancedView, setAdvancedView] = useState(false);
  const [liveMode, setLiveMode] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<0.5 | 1 | 2>(1);
  const [progress, setProgress] = useState(100);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { events, loading, error } = useTraceEvents({
    traceId,
    limit: 180,
    pollIntervalMs: 2000,
    enabled: liveMode,
  });

  const hasTraceId = Boolean(traceId);
  const usingDemo = !hasTraceId;

  useEffect(() => {
    if (!replayMode) return;
    setAdvancedView(true);
    setLiveMode(false);
    setProgress(0);
  }, [replayMode]);

  useEffect(() => {
    if (liveMode) {
      setProgress(100);
      setIsPlaying(false);
    }
  }, [liveMode]);

  useEffect(() => {
    if (liveMode || !isPlaying) return;
    const timer = window.setInterval(() => {
      setProgress((value) => {
        const next = value + speed * 2;
        if (next >= 100) {
          setIsPlaying(false);
          return 100;
        }
        return next;
      });
    }, 250);
    return () => window.clearInterval(timer);
  }, [isPlaying, liveMode, speed]);

  const replayTimestamp = useMemo(() => toProgressTimestamp(events, progress), [events, progress]);
  const graphState = useMemo(
    () => reconstructGraphState(events, liveMode ? undefined : replayTimestamp),
    [events, liveMode, replayTimestamp],
  );

  const selectedNode = GRAPH_NODES.find((node) => node.id === selectedNodeId);

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
    <section className="space-y-6">
      <TerminalLoopShell traceId={traceId || undefined} />

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
          <div className="mt-5 space-y-3">
            <TraceReplayControls
              isLive={liveMode}
              isPlaying={isPlaying}
              speed={speed}
              progress={progress}
              disabled={events.length === 0}
              onLiveToggle={setLiveMode}
              onPlayPause={() => setIsPlaying((value) => !value)}
              onSpeedChange={setSpeed}
              onProgressChange={(value) => {
                setLiveMode(false);
                setProgress(value);
              }}
            />

            {loading ? <p className="text-xs text-slate-400">Loading trace events…</p> : null}
            {error ? <p className="text-xs text-rose-300">{error}</p> : null}
            {events.length === 0 ? <p className="text-xs text-slate-400">Waiting for trace events…</p> : null}

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div className="overflow-x-auto">
                <AgentNodeGraph
                  traceId={traceId}
                  events={events}
                  state={graphState}
                  selectedNodeId={selectedNodeId}
                  onNodeSelect={(nodeId) => {
                    setSelectedNodeId(nodeId);
                    setDrawerOpen(true);
                  }}
                  showDemoLabel={usingDemo}
                />
              </div>

              <aside className="rounded-xl border border-slate-800 bg-slate-950/80 p-3">
                <h3 className="text-sm font-semibold text-slate-100">Recent events</h3>
                <ul className="mt-2 max-h-[460px] space-y-2 overflow-y-auto text-xs">
                  {events.slice(-20).reverse().map((event, index) => (
                    <li key={`${event.event_name}-${event.created_at ?? index}`}>
                      <button
                        type="button"
                        className="w-full rounded border border-slate-800 bg-slate-900/70 px-2 py-1 text-left text-slate-300 hover:border-cyan-400/50"
                        onClick={() => {
                          const agent = String((event.payload?.agent_id ?? '') || '');
                          const mapped = agent && GRAPH_NODES.some((node) => node.id === agent) ? agent : undefined;
                          setSelectedNodeId(mapped ?? selectedNodeId ?? 'decision');
                          setDrawerOpen(true);
                        }}
                      >
                        <p className="truncate">{event.event_name}</p>
                        <p className="text-[11px] text-slate-500">{event.created_at ? new Date(event.created_at).toLocaleTimeString() : 'N/A'}</p>
                      </button>
                    </li>
                  ))}
                </ul>
              </aside>
            </div>

            <EvidenceDrawer open={drawerOpen} node={selectedNode} events={events} onClose={() => setDrawerOpen(false)} />
          </div>
        ) : null}
      </section>
    </section>
  );
}
