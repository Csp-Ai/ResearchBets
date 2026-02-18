'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

export type GraphNode = {
  id: string;
  label: string;
  type: 'agent' | 'stage';
  x: number;
  y: number;
  status: 'idle' | 'active' | 'error';
  lastEventName?: string;
  lastActiveAt?: string;
  meta?: Record<string, unknown>;
};

export type GraphEdge = {
  id: string;
  source: string;
  target: string;
  type: 'data' | 'control';
  status: 'idle' | 'active';
};

export type ControlPlaneEvent = {
  event_name: string;
  trace_id: string;
  request_id?: string;
  created_at?: string;
  payload?: Record<string, unknown>;
};

type AgentNodeGraphProps = {
  events?: ControlPlaneEvent[];
  traceId?: string;
  className?: string;
};

type NodeHistoryEvent = {
  eventName: string;
  createdAt: string;
  requestId?: string;
  confidence?: number;
};

const ACTIVE_DECAY_MS = 1200;
const ERROR_DECAY_MS = 2200;
const AGENT_IDS = ['SlipRecognition', 'ContextVerification', 'PatternClassification', 'Reflection'];

const STAGE_NODE_DEFS = [
  { id: 'wal', label: 'WAL', column: 'left' as const },
  { id: 'fetch', label: 'External Fetch', column: 'left' as const },
  { id: 'evidence', label: 'Evidence Normalize', column: 'left' as const },
  ...AGENT_IDS.map((agentId) => ({ id: agentId, label: agentId, column: 'mid' as const })),
  { id: 'decision', label: 'Decision', column: 'right' as const },
  { id: 'snapshot', label: 'Snapshot Saved', column: 'right' as const },
  { id: 'betlog', label: 'Bet Logged', column: 'right' as const },
];

const EDGE_DEFS: Omit<GraphEdge, 'status'>[] = [
  { id: 'wal-fetch', source: 'wal', target: 'fetch', type: 'data' },
  { id: 'fetch-evidence', source: 'fetch', target: 'evidence', type: 'data' },
  ...AGENT_IDS.map((agentId) => ({ id: `evidence-${agentId}`, source: 'evidence', target: agentId, type: 'control' as const })),
  ...AGENT_IDS.map((agentId) => ({ id: `${agentId}-decision`, source: agentId, target: 'decision', type: 'data' as const })),
  { id: 'decision-snapshot', source: 'decision', target: 'snapshot', type: 'data' },
  { id: 'snapshot-betlog', source: 'snapshot', target: 'betlog', type: 'data' },
];

const DEMO_EVENT_BLUEPRINT: Array<Omit<ControlPlaneEvent, 'trace_id' | 'created_at'>> = [
  { event_name: 'external_fetch_started', payload: { stage: 'wal' } },
  { event_name: 'external_fetch_completed', payload: { stage: 'fetch' } },
  { event_name: 'data_normalized', payload: { stage: 'evidence' } },
  { event_name: 'agent_invocation_started', payload: { agent_id: 'ContextVerification' } },
  { event_name: 'agent_invocation_completed', payload: { agent_id: 'ContextVerification', confidence: 0.72 } },
  { event_name: 'agent_invocation_started', payload: { agent_id: 'PatternClassification' } },
  { event_name: 'agent_scored_decision', payload: { agent_id: 'PatternClassification', confidence: 0.69 } },
  { event_name: 'edge_report_generated', payload: { stage: 'snapshot' } },
  { event_name: 'odds_snapshot_captured', payload: { stage: 'snapshot' } },
];

function formatTimestamp(value?: string) {
  if (!value) return 'N/A';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleTimeString();
}

function parseAgentId(payload?: Record<string, unknown>): string | null {
  const raw = payload?.agent_id ?? payload?.agentId ?? payload?.agent ?? payload?.node_id;
  if (typeof raw === 'string' && raw.trim().length > 0) {
    return raw;
  }
  return null;
}

function parseConfidence(payload?: Record<string, unknown>): number | undefined {
  const value = payload?.confidence;
  return typeof value === 'number' ? value : undefined;
}

function computeGraphLayout(width: number, height: number): GraphNode[] {
  const safeWidth = Math.max(680, width);
  const safeHeight = Math.max(360, height);
  const columnX = {
    left: safeWidth * 0.18,
    mid: safeWidth * 0.5,
    right: safeWidth * 0.82,
  };

  const leftCount = STAGE_NODE_DEFS.filter((node) => node.column === 'left').length;
  const midCount = STAGE_NODE_DEFS.filter((node) => node.column === 'mid').length;
  const rightCount = STAGE_NODE_DEFS.filter((node) => node.column === 'right').length;

  const nextIndex = { left: 0, mid: 0, right: 0 };

  return STAGE_NODE_DEFS.map((definition) => {
    const current = nextIndex[definition.column];
    nextIndex[definition.column] += 1;

    const totalForColumn = definition.column === 'left' ? leftCount : definition.column === 'mid' ? midCount : rightCount;
    const y = safeHeight * ((current + 1) / (totalForColumn + 1));

    return {
      id: definition.id,
      label: definition.label,
      type: AGENT_IDS.includes(definition.id) ? 'agent' : 'stage',
      x: columnX[definition.column],
      y,
      status: 'idle',
    };
  });
}

export function AgentNodeGraph({ events, traceId = 'demo-trace', className }: AgentNodeGraphProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 860, height: 420 });
  const [activeNodes, setActiveNodes] = useState<Record<string, GraphNode>>({});
  const [activeEdges, setActiveEdges] = useState<Record<string, GraphEdge['status']>>({});
  const [nodeEventHistory, setNodeEventHistory] = useState<Record<string, NodeHistoryEvent[]>>({});
  const [pinnedNodeId, setPinnedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [demoEvents, setDemoEvents] = useState<ControlPlaneEvent[]>([]);
  const latestIndexRef = useRef(0);
  const timeoutRefs = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setSize({ width: Math.max(entry.contentRect.width, 680), height: Math.max(entry.contentRect.height, 360) });
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (events && events.length > 0) {
      setDemoEvents([]);
      return;
    }

    let index = 0;
    const timer = setInterval(() => {
      const template = DEMO_EVENT_BLUEPRINT[index % DEMO_EVENT_BLUEPRINT.length];
      if (!template) return;
      const payload = template.payload ? { ...template.payload } : undefined;
      setDemoEvents((previous) => [
        ...previous.slice(-20),
        {
          ...template,
          trace_id: traceId,
          request_id: `demo-${index}`,
          created_at: new Date().toISOString(),
          payload,
        },
      ]);
      index += 1;
    }, 1450);

    return () => clearInterval(timer);
  }, [events, traceId]);

  const incomingEvents = events && events.length > 0 ? events : demoEvents;

  const baseNodes = useMemo(() => computeGraphLayout(size.width, size.height), [size.width, size.height]);

  const mergedNodes = useMemo(
    () =>
      baseNodes.map((node) => {
        const override = activeNodes[node.id];
        return override ? { ...node, ...override, x: node.x, y: node.y } : node;
      }),
    [activeNodes, baseNodes],
  );

  const mergedEdges = useMemo(
    () => EDGE_DEFS.map((edge) => ({ ...edge, status: activeEdges[edge.id] ?? 'idle' })),
    [activeEdges],
  );

  useEffect(() => {
    if (incomingEvents.length === 0) return;
    if (latestIndexRef.current > incomingEvents.length) {
      latestIndexRef.current = 0;
    }

    const unprocessed = incomingEvents.slice(latestIndexRef.current);
    latestIndexRef.current = incomingEvents.length;

    if (unprocessed.length === 0) return;

    const scheduleDecay = (key: string, decayMs: number, status: GraphNode['status'] = 'idle') => {
      const activeTimer = timeoutRefs.current.get(key);
      if (activeTimer) {
        clearTimeout(activeTimer);
      }
      const timer = setTimeout(() => {
        setActiveNodes((previous) => {
          const existing = previous[key];
          if (!existing) return previous;
          return {
            ...previous,
            [key]: {
              ...existing,
              status,
            },
          };
        });
      }, decayMs);
      timeoutRefs.current.set(key, timer);
    };

    const setEdgePulse = (edgeId: string, decayMs = ACTIVE_DECAY_MS) => {
      setActiveEdges((previous) => ({ ...previous, [edgeId]: 'active' }));
      setTimeout(() => {
        setActiveEdges((previous) => ({ ...previous, [edgeId]: 'idle' }));
      }, decayMs);
    };

    const updateNode = (nodeId: string, event: ControlPlaneEvent, status: GraphNode['status'], decayMs = ACTIVE_DECAY_MS) => {
      const confidence = parseConfidence(event.payload);
      setActiveNodes((previous) => ({
        ...previous,
        [nodeId]: {
          ...(previous[nodeId] ?? { id: nodeId, label: nodeId, type: AGENT_IDS.includes(nodeId) ? 'agent' : 'stage', x: 0, y: 0 }),
          status,
          lastEventName: event.event_name,
          lastActiveAt: event.created_at ?? new Date().toISOString(),
          meta: {
            ...(previous[nodeId]?.meta ?? {}),
            confidence,
            request_id: event.request_id,
          },
        },
      }));
      scheduleDecay(nodeId, decayMs);
      setNodeEventHistory((previous) => {
        const existing = previous[nodeId] ?? [];
        const nextEntry: NodeHistoryEvent = {
          eventName: event.event_name,
          createdAt: event.created_at ?? new Date().toISOString(),
          requestId: event.request_id,
          confidence,
        };
        return {
          ...previous,
          [nodeId]: [nextEntry, ...existing].slice(0, 10),
        };
      });
    };

    for (const event of unprocessed) {
      const eventName = event.event_name;
      const agentId = parseAgentId(event.payload);

      if (eventName === 'agent_invocation_started' && agentId) {
        updateNode(agentId, event, 'active', ACTIVE_DECAY_MS + 400);
        setEdgePulse(`evidence-${agentId}`);
        setEdgePulse(`${agentId}-decision`, ACTIVE_DECAY_MS + 250);
        continue;
      }

      if (eventName === 'agent_invocation_completed' && agentId) {
        updateNode(agentId, event, 'active', ACTIVE_DECAY_MS);
        setEdgePulse(`${agentId}-decision`);
        continue;
      }

      if (eventName === 'agent_error' && agentId) {
        updateNode(agentId, event, 'error', ERROR_DECAY_MS);
        continue;
      }

      if (eventName === 'agent_scored_decision') {
        updateNode('decision', event, 'active', ACTIVE_DECAY_MS + 300);
        if (agentId) {
          setEdgePulse(`${agentId}-decision`, ACTIVE_DECAY_MS + 400);
          updateNode(agentId, event, 'active', ACTIVE_DECAY_MS);
        }
        setEdgePulse('decision-snapshot', ACTIVE_DECAY_MS + 500);
        continue;
      }

      if (eventName.startsWith('external_fetch_')) {
        updateNode('wal', event, 'active', ACTIVE_DECAY_MS);
        updateNode('fetch', event, 'active', ACTIVE_DECAY_MS);
        setEdgePulse('wal-fetch');
        setEdgePulse('fetch-evidence');
        continue;
      }

      if (eventName === 'data_normalized') {
        updateNode('evidence', event, 'active', ACTIVE_DECAY_MS + 300);
        setEdgePulse('fetch-evidence');
        continue;
      }

      if (eventName === 'edge_report_generated' || eventName === 'odds_snapshot_captured') {
        updateNode('snapshot', event, 'active', ACTIVE_DECAY_MS + 300);
        setEdgePulse('decision-snapshot');
        setEdgePulse('snapshot-betlog', ACTIVE_DECAY_MS + 500);
        continue;
      }

      if (eventName === 'game_result_ingested') {
        updateNode('betlog', event, 'active', ACTIVE_DECAY_MS + 400);
      }
    }
  }, [incomingEvents]);

  useEffect(
    () => () => {
      timeoutRefs.current.forEach((timer) => clearTimeout(timer));
    },
    [],
  );

  const nodeLookup = useMemo(() => Object.fromEntries(mergedNodes.map((node) => [node.id, node])), [mergedNodes]);
  const hoveredNode = hoveredNodeId ? nodeLookup[hoveredNodeId] : null;
  const pinnedHistory = pinnedNodeId ? nodeEventHistory[pinnedNodeId] ?? [] : [];

  return (
    <section className={className}>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="relative overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/90 p-2">
          <div
            ref={containerRef}
            className="agent-grid-bg relative min-h-[360px] min-w-[720px] overflow-hidden rounded-lg border border-slate-800/80"
            role="img"
            aria-label="Agent orchestration graph"
          >
            <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 ${size.width} ${size.height}`} preserveAspectRatio="none">
              {mergedEdges.map((edge) => {
                const source = nodeLookup[edge.source];
                const target = nodeLookup[edge.target];
                if (!source || !target) return null;
                const pulseClass = edge.status === 'active' ? 'animate-edge-pulse' : '';

                return (
                  <g key={edge.id}>
                    <line
                      x1={source.x}
                      y1={source.y}
                      x2={target.x}
                      y2={target.y}
                      className="stroke-slate-600/70"
                      strokeWidth={1.35}
                      strokeLinecap="round"
                    />
                    {edge.status === 'active' ? (
                      <line
                        x1={source.x}
                        y1={source.y}
                        x2={target.x}
                        y2={target.y}
                        className={`stroke-cyan-300/90 ${pulseClass}`}
                        strokeWidth={2.25}
                        strokeLinecap="round"
                        strokeDasharray="8 14"
                      />
                    ) : null}
                  </g>
                );
              })}
            </svg>

            {mergedNodes.map((node) => {
              const isActive = node.status === 'active';
              const isError = node.status === 'error';
              const nodeConfidence = typeof node.meta?.confidence === 'number' ? (node.meta.confidence as number) : undefined;
              return (
                <button
                  key={node.id}
                  type="button"
                  className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border text-left transition ${
                    isError
                      ? 'border-rose-400/80 bg-rose-500/20 shadow-[0_0_22px_rgba(251,113,133,0.4)]'
                      : isActive
                        ? 'animate-node-pulse border-cyan-300/90 bg-cyan-400/20 shadow-[0_0_22px_rgba(34,211,238,0.35)]'
                        : 'border-slate-700 bg-slate-900/90'
                  } ${pinnedNodeId === node.id ? 'ring-2 ring-cyan-300/70' : ''}`}
                  style={{ left: `${(node.x / size.width) * 100}%`, top: `${(node.y / size.height) * 100}%` }}
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId((current) => (current === node.id ? null : current))}
                  onFocus={() => setHoveredNodeId(node.id)}
                  onBlur={() => setHoveredNodeId((current) => (current === node.id ? null : current))}
                  onClick={() => setPinnedNodeId((current) => (current === node.id ? null : node.id))}
                  aria-pressed={pinnedNodeId === node.id}
                >
                  <span className="block h-6 w-6 rounded-full md:h-7 md:w-7" aria-hidden />
                  <span className="pointer-events-none absolute left-1/2 top-[calc(100%+0.3rem)] -translate-x-1/2 whitespace-nowrap text-[11px] text-slate-300">
                    {node.label}
                  </span>
                  <span className="sr-only">
                    {node.label}, {node.status}, {node.lastEventName ?? 'no recent event'}
                    {nodeConfidence ? ` confidence ${Math.round(nodeConfidence * 100)} percent` : ''}
                  </span>
                </button>
              );
            })}

            {hoveredNode ? (
              <div
                className="pointer-events-none absolute z-20 w-56 rounded-md border border-slate-700 bg-slate-900/95 p-2 text-xs text-slate-200 shadow-lg"
                style={{
                  left: `min(${(hoveredNode.x / size.width) * 100 + 2}%, calc(100% - 14rem))`,
                  top: `max(${(hoveredNode.y / size.height) * 100 - 8}%, 0.5rem)`,
                }}
              >
                <p className="font-medium text-cyan-200">{hoveredNode.label}</p>
                <p className="mt-1 text-slate-300">Event: {hoveredNode.lastEventName ?? 'No activity yet'}</p>
                <p className="text-slate-400">Last active: {formatTimestamp(hoveredNode.lastActiveAt)}</p>
                <p className="text-slate-400">
                  Confidence:{' '}
                  {typeof hoveredNode.meta?.confidence === 'number'
                    ? `${Math.round((hoveredNode.meta.confidence as number) * 100)}%`
                    : 'N/A'}
                </p>
              </div>
            ) : null}

            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(34,211,238,0.1),transparent_35%)]" />
          </div>
        </div>

        <aside className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
          <h3 className="text-sm font-semibold text-slate-100">Pinned Agent Activity</h3>
          <p className="mt-1 text-xs text-slate-400">Click a node to pin up to 10 recent events for that node.</p>
          <div className="mt-4 space-y-2">
            {pinnedNodeId ? (
              <>
                <p className="text-xs font-mono text-cyan-200">{nodeLookup[pinnedNodeId]?.label ?? pinnedNodeId}</p>
                {pinnedHistory.length > 0 ? (
                  pinnedHistory.map((item, index) => (
                    <article key={`${item.eventName}-${item.createdAt}-${index}`} className="rounded-md border border-slate-800 bg-slate-950/75 p-2 text-xs">
                      <p className="text-slate-200">{item.eventName}</p>
                      <p className="mt-0.5 font-mono text-[11px] text-slate-400">{formatTimestamp(item.createdAt)}</p>
                      <p className="mt-0.5 text-slate-400">request_id: {item.requestId ?? 'N/A'}</p>
                      {typeof item.confidence === 'number' ? <p className="text-cyan-300">confidence: {(item.confidence * 100).toFixed(0)}%</p> : null}
                    </article>
                  ))
                ) : (
                  <p className="rounded-md border border-slate-800 bg-slate-950/75 p-2 text-xs text-slate-400">No events processed yet.</p>
                )}
              </>
            ) : (
              <p className="rounded-md border border-slate-800 bg-slate-950/75 p-2 text-xs text-slate-400">No node pinned.</p>
            )}
          </div>
        </aside>
      </div>

      <style jsx>{`
        .agent-grid-bg {
          background-image:
            linear-gradient(to right, rgba(148, 163, 184, 0.08) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(148, 163, 184, 0.08) 1px, transparent 1px),
            radial-gradient(circle at 14% 16%, rgba(56, 189, 248, 0.12), transparent 38%);
          background-size: 30px 30px, 30px 30px, auto;
        }

        .agent-grid-bg::after {
          content: '';
          position: absolute;
          inset: 0;
          background-image: radial-gradient(rgba(148, 163, 184, 0.07) 0.65px, transparent 0.65px);
          background-size: 4px 4px;
          opacity: 0.22;
          pointer-events: none;
        }

        .animate-node-pulse {
          animation: nodePulse 1.1s ease-in-out infinite;
        }

        @keyframes nodePulse {
          0%,
          100% {
            transform: translate(-50%, -50%) scale(1);
          }
          50% {
            transform: translate(-50%, -50%) scale(1.1);
          }
        }

        .animate-edge-pulse {
          animation: edgePulse 0.9s linear infinite;
        }

        @keyframes edgePulse {
          from {
            stroke-dashoffset: 44;
          }
          to {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </section>
  );
}
