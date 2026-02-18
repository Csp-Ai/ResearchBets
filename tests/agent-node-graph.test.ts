import { describe, expect, it } from 'vitest';

import { GRAPH_NODES, reconstructGraphState, type ControlPlaneEvent } from '../src/components/AgentNodeGraph';

describe('AgentNodeGraph replay state', () => {
  it('returns idle statuses for empty event stream', () => {
    const state = reconstructGraphState([]);
    expect(GRAPH_NODES.every((node) => state.nodeState[node.id]?.status === 'idle')).toBe(true);
    expect(state.activeEdges.size).toBe(0);
  });

  it('maps fetch and agent score events to expected active nodes', () => {
    const base = Date.now();
    const events: ControlPlaneEvent[] = [
      { event_name: 'external_fetch_started', trace_id: 't', created_at: new Date(base).toISOString() },
      {
        event_name: 'agent_scored_decision',
        trace_id: 't',
        created_at: new Date(base + 200).toISOString(),
        payload: { agent_id: 'PatternClassification' },
      },
    ];

    const state = reconstructGraphState(events, base + 500);
    expect(state.nodeState.wal_search?.status).toBe('active');
    expect(state.nodeState.PatternClassification?.status).toBe('active');
    expect(state.nodeState.decision?.status).toBe('active');
    expect(state.activeEdges.has('PatternClassification-decision')).toBe(true);
  });

  it('replay timestamp gates later events', () => {
    const base = Date.now();
    const events: ControlPlaneEvent[] = [
      {
        event_name: 'agent_error',
        trace_id: 't',
        created_at: new Date(base + 100).toISOString(),
        payload: { agent_id: 'Reflection' },
      },
      {
        event_name: 'agent_invocation_completed',
        trace_id: 't',
        created_at: new Date(base + 7000).toISOString(),
        payload: { agent_id: 'Reflection' },
      },
    ];

    const earlierState = reconstructGraphState(events, base + 200);
    const laterState = reconstructGraphState(events, base + 7500);

    expect(earlierState.nodeState.Reflection?.status).toBe('error');
    expect(laterState.nodeState.Reflection?.status).toBe('active');
  });
});
