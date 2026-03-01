import { beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe('/api/run/stress-test POST', () => {
  it('ensures trace_id and emits canonical event sequence', async () => {
    const emitRunEvents = vi.fn(async () => 4);

    vi.doMock('@/src/core/events/eventEmitter.server', () => ({
      emitRunEvents,
    }));

    const { POST } = await import('../route');
    const request = new Request('http://localhost:3000/api/run/stress-test?sport=nba&tz=UTC&date=2026-01-20&mode=demo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        legs: [
          { player: 'A', market: 'points', line: '20.5', odds: '-110', game_id: 'g1' },
          { player: 'B', market: 'rebounds', line: '8.5', odds: '+140', game_id: 'g1' }
        ]
      })
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const body = await response.json() as { trace_id: string; events_written: boolean; spine: { trace_id: string } };
    expect(body.trace_id).toBeTruthy();
    expect(body.events_written).toBe(true);
    expect(body.spine.trace_id).toBe(body.trace_id);

    const eventTypes = emitRunEvents.mock.calls[0][0].events.map((event: { type: string }) => event.type);
    expect(eventTypes).toEqual(['run_created', 'stage_analyze_started', 'analysis_ready', 'stage_analyze_complete']);
  });
});
