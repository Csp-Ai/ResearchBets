'use client';

import { useMemo } from 'react';

export type ControlPlaneEvent = {
  id?: string;
  event_name: string;
  trace_id: string;
  request_id?: string;
  created_at?: string;
  payload?: Record<string, unknown>;
};

export type NodeStatus = 'idle' | 'active' | 'error';

export type GraphNodeDefinition = {
  id: string;
  label: string;
  kind: 'wal' | 'agent' | 'system';
  column: 'left' | 'middle' | 'right';
};

export type GraphEdgeDefinition = {
  id: string;
  source: string;
  target: string;
};

export type NodeState = {
  status: NodeStatus;
  lastEvent?: ControlPlaneEvent;
  lastActivityAt?: number;
};

export type GraphReplayState = {
  nodeState: Record<string, NodeState>;
  activeEdges: Set<string>;
};

const KNOWN_AGENTS = ['SlipRecognition', 'ContextVerification', 'PatternClassification', 'Reflection'];
const ACTIVE_WINDOW_MS = 5_000;

export const GRAPH_NODES: GraphNodeDefinition[] = [
  { id: 'slip', label: 'Slip', kind: 'system', column: 'left' },
  { id: 'wal_search', label: 'WAL Search', kind: 'wal', column: 'left' },
  { id: 'wal_fetch', label: 'WAL Fetch', kind: 'wal', column: 'left' },
  { id: 'wal_normalize', label: 'Normalize', kind: 'wal', column: 'left' },
  { id: 'odds', label: 'Odds', kind: 'system', column: 'left' },
  ...KNOWN_AGENTS.map((agent) => ({ id: agent, label: agent, kind: 'agent' as const, column: 'middle' as const })),
  { id: 'decision', label: 'Decision', kind: 'system', column: 'middle' },
  { id: 'snapshot_saved', label: 'Snapshot', kind: 'system', column: 'right' },
  { id: 'bet_logged', label: 'Bet Logged', kind: 'system', column: 'right' },
  { id: 'outcome', label: 'Outcome', kind: 'system', column: 'right' },
  { id: 'edge_report', label: 'Edge Report', kind: 'system', column: 'right' },
];

export const GRAPH_EDGES: GraphEdgeDefinition[] = [
  { id: 'slip-wal-search', source: 'slip', target: 'wal_search' },
  { id: 'wal-search-fetch', source: 'wal_search', target: 'wal_fetch' },
  { id: 'wal-fetch-normalize', source: 'wal_fetch', target: 'wal_normalize' },
  ...KNOWN_AGENTS.map((agent) => ({ id: `normalize-${agent}`, source: 'wal_normalize', target: agent })),
  ...KNOWN_AGENTS.map((agent) => ({ id: `${agent}-decision`, source: agent, target: 'decision' })),
  { id: 'decision-snapshot', source: 'decision', target: 'snapshot_saved' },
  { id: 'snapshot-bet', source: 'snapshot_saved', target: 'bet_logged' },
  { id: 'snapshot-outcome', source: 'snapshot_saved', target: 'outcome' },
  { id: 'outcome-edge', source: 'outcome', target: 'edge_report' },
  { id: 'odds-decision', source: 'odds', target: 'decision' },
];

const EDGE_LOOKUP = new Map(GRAPH_EDGES.map((edge) => [edge.id, edge]));

function parseMillis(value?: string): number {
  if (!value) return 0;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function parseAgentId(payload?: Record<string, unknown>): string | undefined {
  const raw = payload?.agent_id ?? payload?.agentId ?? payload?.agent;
  return typeof raw === 'string' && raw.length > 0 ? raw : undefined;
}

function nodeIdsForEvent(event: ControlPlaneEvent): string[] {
  switch (event.event_name) {
    case 'external_fetch_started':
    case 'external_fetch_completed':
    case 'external_fetch_failed':
      return ['wal_search', 'wal_fetch'];
    case 'data_normalized':
      return ['wal_normalize'];
    case 'agent_invocation_started':
    case 'agent_invocation_completed':
    case 'agent_error': {
      const agent = parseAgentId(event.payload);
      return agent ? [agent] : [];
    }
    case 'agent_scored_decision': {
      const agent = parseAgentId(event.payload);
      return agent ? [agent, 'decision'] : ['decision'];
    }
    case 'slip_submitted':
    case 'slip_extracted':
      return ['slip'];
    case 'odds_snapshot_captured':
      return ['odds'];
    case 'snapshot_saved':
      return ['snapshot_saved'];
    case 'bet_logged':
      return ['bet_logged'];
    case 'game_result_ingested':
    case 'user_outcome_recorded':
      return ['outcome'];
    case 'edge_report_generated':
      return ['edge_report'];
    default:
      return [];
  }
}

function edgeIdsForEvent(event: ControlPlaneEvent): string[] {
  const agent = parseAgentId(event.payload);
  switch (event.event_name) {
    case 'external_fetch_started':
    case 'external_fetch_completed':
    case 'external_fetch_failed':
      return ['slip-wal-search', 'wal-search-fetch', 'wal-fetch-normalize'];
    case 'data_normalized':
      return ['wal-fetch-normalize'];
    case 'agent_invocation_started':
    case 'agent_invocation_completed':
      return agent ? [`normalize-${agent}`] : [];
    case 'agent_scored_decision':
      return agent ? [`${agent}-decision`, 'decision-snapshot'] : ['decision-snapshot'];
    case 'odds_snapshot_captured':
      return ['odds-decision'];
    case 'snapshot_saved':
      return ['decision-snapshot'];
    case 'bet_logged':
      return ['snapshot-bet'];
    case 'game_result_ingested':
    case 'user_outcome_recorded':
      return ['snapshot-outcome', 'outcome-edge'];
    case 'edge_report_generated':
      return ['outcome-edge'];
    default:
      return [];
  }
}

export function reconstructGraphState(events: ControlPlaneEvent[], asOfTimestamp?: number): GraphReplayState {
  const sorted = [...events].sort((a, b) => parseMillis(a.created_at) - parseMillis(b.created_at));
  const latestEventTime = parseMillis(sorted.at(-1)?.created_at);
  const now = asOfTimestamp ?? (latestEventTime || Date.now());
  const nodeState: Record<string, NodeState> = Object.fromEntries(
    GRAPH_NODES.map((node) => [node.id, { status: 'idle' as const }]),
  );

  const activeEdges = new Set<string>();

  for (const event of sorted) {
    const eventMs = parseMillis(event.created_at);
    if (eventMs > now) break;

    const ids = nodeIdsForEvent(event);
    for (const nodeId of ids) {
      const existing = nodeState[nodeId] ?? { status: 'idle' as const };
      nodeState[nodeId] = {
        status: event.event_name === 'agent_error' ? 'error' : 'active',
        lastEvent: event,
        lastActivityAt: eventMs,
      };
      if (existing.status === 'error' && event.event_name !== 'agent_error') {
        nodeState[nodeId].status = 'active';
      }
    }

    for (const edgeId of edgeIdsForEvent(event)) {
      if (EDGE_LOOKUP.has(edgeId)) {
        activeEdges.add(edgeId);
      }
    }
  }

  for (const node of GRAPH_NODES) {
    const state = nodeState[node.id] ?? { status: 'idle' as const };
    if (!state.lastActivityAt) continue;
    const elapsed = now - state.lastActivityAt;
    if (elapsed > ACTIVE_WINDOW_MS && state.status !== 'error') {
      nodeState[node.id] = { ...state, status: 'idle' };
    }
    if (elapsed > ACTIVE_WINDOW_MS * 2 && state.status === 'error') {
      nodeState[node.id] = { ...state, status: 'idle' };
    }
  }

  return { nodeState, activeEdges };
}

type AgentNodeGraphProps = {
  events: ControlPlaneEvent[];
  state: GraphReplayState;
  selectedNodeId?: string | null;
  onNodeSelect?: (nodeId: string) => void;
  className?: string;
  traceId?: string;
  showDemoLabel?: boolean;
};

function classForNodeStatus(status: NodeStatus) {
  if (status === 'error') return 'border-rose-400/70 bg-rose-500/10 shadow-[0_0_24px_rgba(251,113,133,0.38)]';
  if (status === 'active') return 'node-active border-cyan-300/80 bg-cyan-400/10 shadow-[0_0_24px_rgba(34,211,238,0.35)]';
  return 'border-slate-700 bg-slate-900/85';
}

export function AgentNodeGraph({ events, state, selectedNodeId, onNodeSelect, className, traceId, showDemoLabel }: AgentNodeGraphProps) {
  const nodePositions = useMemo(() => {
    const byColumn = {
      left: GRAPH_NODES.filter((node) => node.column === 'left'),
      middle: GRAPH_NODES.filter((node) => node.column === 'middle'),
      right: GRAPH_NODES.filter((node) => node.column === 'right'),
    };

    const placeColumn = (column: keyof typeof byColumn, xPct: number) => {
      const columnNodes = byColumn[column];
      return columnNodes.map((node, index) => ({
        ...node,
        x: xPct,
        y: ((index + 1) / (columnNodes.length + 1)) * 100,
      }));
    };

    return [...placeColumn('left', 18), ...placeColumn('middle', 50), ...placeColumn('right', 82)];
  }, []);

  const lookup = useMemo(() => Object.fromEntries(nodePositions.map((node) => [node.id, node])), [nodePositions]);

  return (
    <section className={className}>
      <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3">
        <div className="relative min-h-[460px] min-w-[860px] overflow-hidden rounded-lg border border-slate-800 graph-grid">
          {showDemoLabel ? <p className="absolute right-3 top-3 z-30 rounded border border-amber-400/40 bg-amber-400/10 px-2 py-1 text-[11px] text-amber-200">Demo (no trace_id)</p> : null}
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
            {GRAPH_EDGES.map((edge) => {
              const source = lookup[edge.source];
              const target = lookup[edge.target];
              if (!source || !target) return null;
              const active = state.activeEdges.has(edge.id);
              return (
                <g key={edge.id}>
                  <line x1={source.x} y1={source.y} x2={target.x} y2={target.y} stroke="rgba(148,163,184,0.35)" strokeWidth="0.35" />
                  {active ? (
                    <line
                      x1={source.x}
                      y1={source.y}
                      x2={target.x}
                      y2={target.y}
                      className="edge-travel"
                      stroke="rgba(103,232,249,0.95)"
                      strokeWidth="0.7"
                      strokeDasharray="2.2 3.8"
                    />
                  ) : null}
                </g>
              );
            })}
          </svg>

          {nodePositions.map((node) => {
            const nodeState = state.nodeState[node.id] ?? { status: 'idle' as const };
            const active = nodeState.status === 'active';
            const selected = selectedNodeId === node.id;
            return (
              <button
                key={node.id}
                type="button"
                aria-label={`${node.label} node`}
                onClick={() => onNodeSelect?.(node.id)}
                className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border px-3 py-2 text-[11px] font-medium text-slate-200 transition ${classForNodeStatus(nodeState.status)} ${selected ? 'ring-2 ring-cyan-300/70' : ''}`}
                style={{ left: `${node.x}%`, top: `${node.y}%` }}
              >
                <span className="pointer-events-none block whitespace-nowrap">{node.label}</span>
                {active ? <span className="sr-only">active</span> : null}
              </button>
            );
          })}

          <div className="absolute bottom-2 left-2 rounded border border-slate-800/80 bg-slate-950/80 px-2 py-1 text-[11px] text-slate-400">
            Trace: <span className="font-mono text-slate-300">{traceId || 'not provided'}</span> · Events: {events.length}
          </div>
        </div>
      </div>

      <style jsx>{`
        .graph-grid {
          background-image:
            linear-gradient(to right, rgba(148, 163, 184, 0.1) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(148, 163, 184, 0.1) 1px, transparent 1px),
            radial-gradient(circle at 20% 10%, rgba(34, 211, 238, 0.1), transparent 45%);
          background-size: 32px 32px, 32px 32px, auto;
        }

        .node-active {
          animation: nodePulse 1.2s ease-in-out infinite;
        }

        .edge-travel {
          animation: edgeTravel 1.1s linear infinite;
        }

        @keyframes nodePulse {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.04);
          }
        }

        @keyframes edgeTravel {
          from {
            stroke-dashoffset: 18;
          }
          to {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </section>
  );
}
