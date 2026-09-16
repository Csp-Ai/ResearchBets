import { describe, expect, it } from 'vitest';

import {
  HABIT_LOOP_VERSION,
  buildHabitLoopEvent,
  canonicalStageForPath,
} from '@/src/core/analytics/habitLoop';
import { ControlPlaneEventSchema } from '@/src/core/control-plane/events';

describe('canonical habit-loop analytics', () => {
  it('maps canonical and supported entry routes to one lifecycle', () => {
    expect(canonicalStageForPath('/')).toBe('discover_build');
    expect(canonicalStageForPath('/slip')).toBe('discover_build');
    expect(canonicalStageForPath('/ingest/')).toBe('discover_build');
    expect(canonicalStageForPath('/stress-test')).toBe('xray');
    expect(canonicalStageForPath('/pulse')).toBe('pulse');
    expect(canonicalStageForPath('/track')).toBe('pulse');
    expect(canonicalStageForPath('/review')).toBe('review_memory');
    expect(canonicalStageForPath('/history')).toBeNull();
  });

  it('builds a versioned event that preserves lifecycle identity and truth context', () => {
    const event = buildHabitLoopEvent({
      eventName: 'lifecycle_useful_answer_ready',
      stage: 'xray',
      route: '/stress-test',
      visitId: 'visit-1',
      timestamp: '2026-09-16T12:00:00.000Z',
      requestId: 'request-1',
      sessionId: 'anon-1',
      traceId: 'trace-1',
      spine: {
        ticketId: 'ticket-1',
        trace_id: 'trace-1',
        slip_id: 'slip-1',
        sport: 'NFL',
        tz: 'America/Phoenix',
        date: '2026-09-16',
        mode: 'live',
      },
      properties: { answer_type: 'structural_risk', duration_ms: 420 },
    });

    expect(ControlPlaneEventSchema.parse(event)).toEqual(event);
    expect(event.properties).toMatchObject({
      stage: 'xray',
      route: '/stress-test',
      visit_id: 'visit-1',
      ticket_id: 'ticket-1',
      slip_id: 'slip-1',
      analytics_version: HABIT_LOOP_VERSION,
      answer_type: 'structural_risk',
      duration_ms: 420,
    });
  });
});
