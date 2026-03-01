import { describe, expect, it } from 'vitest';

import { mergeTraceEvents } from '@/src/hooks/useTraceEvents';

import type { ControlPlaneEvent } from '@/src/components/AgentNodeGraph';

describe('mergeTraceEvents', () => {
  it('appends new events, skips duplicates, and keeps chronological order', () => {
    const previous: ControlPlaneEvent[] = [
      { id: '1', event_name: 'run_started', trace_id: 't-1', created_at: '2026-01-01T00:00:00.000Z', payload: {} },
      { id: '2', event_name: 'slip_submitted', trace_id: 't-1', created_at: '2026-01-01T00:00:01.000Z', payload: {} },
    ];

    const incoming: ControlPlaneEvent[] = [
      { id: '2', event_name: 'slip_submitted', trace_id: 't-1', created_at: '2026-01-01T00:00:01.000Z', payload: {} },
      { id: '3', event_name: 'run_completed', trace_id: 't-1', created_at: '2026-01-01T00:00:02.000Z', payload: {} },
    ];

    expect(mergeTraceEvents(previous, incoming).map((event) => event.id)).toEqual(['1', '2', '3']);
  });
});
