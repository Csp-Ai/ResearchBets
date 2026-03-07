import { describe, expect, it, vi } from 'vitest';

import { SupabaseRuntimeStore } from '../supabaseRuntimeStore';

describe('SupabaseRuntimeStore listEvents', () => {
  it('maps timestamp from legacy row.timestamp when created_at is null', async () => {
    const rows = [
      {
        event_name: 'agent_scored_decision',
        created_at: null,
        timestamp: '2026-02-19T00:00:00.000Z',
        request_id: 'r-1',
        trace_id: 't-1',
        run_id: 'run-1',
        session_id: 's-1',
        user_id: 'u-1',
        agent_id: 'agent-1',
        model_version: 'gpt-test',
        confidence: 0.7,
        assumptions: ['a1'],
        properties: { source: 'legacy' }
      }
    ];

    const client = {
      from: () => ({
        select: () => ({
          order: () => ({
            limit: async () => ({ data: rows, error: null })
          })
        })
      })
    };

    const store = new SupabaseRuntimeStore(client as never);
    const events = await store.listEvents({ limit: 10 });

    expect(events).toHaveLength(1);
    expect(events[0]).toBeDefined();
    expect(events[0]?.timestamp).toBe('2026-02-19T00:00:00.000Z');
  });
});

describe('SupabaseRuntimeStore saveEvent', () => {
  it('writes canonical analytics columns and nests runtime context in properties', async () => {
    const insert = vi.fn(async () => ({ error: null }));
    const client = {
      from: () => ({ insert })
    };

    const store = new SupabaseRuntimeStore(client as never);
    await store.saveEvent({
      event_name: 'ui_view_loaded',
      timestamp: '2026-03-05T12:00:00.000Z',
      request_id: 'req-1',
      trace_id: 'trace-1',
      run_id: 'run-1',
      session_id: 'session-1',
      user_id: 'user-1',
      agent_id: 'today',
      model_version: 'v1',
      mode: 'demo',
      reason: 'demo_requested',
      sport: 'NBA',
      tz: 'America/Phoenix',
      date: '2026-03-05',
      properties: { route: '/today' }
    });

    expect(insert).toHaveBeenCalledTimes(1);
    expect(insert).toHaveBeenCalledWith({
      event_name: 'ui_view_loaded',
      request_id: 'req-1',
      trace_id: 'trace-1',
      run_id: 'run-1',
      session_id: 'session-1',
      user_id: 'user-1',
      agent_id: 'today',
      model_version: 'v1',
      created_at: '2026-03-05T12:00:00.000Z',
      properties: {
        route: '/today',
        runtime_context: {
          mode: 'demo',
          reason: 'demo_requested',
          sport: 'NBA',
          tz: 'America/Phoenix',
          date: '2026-03-05'
        }
      }
    });
  });
});
