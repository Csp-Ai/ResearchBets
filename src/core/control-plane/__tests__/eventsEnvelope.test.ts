import { describe, expect, it } from 'vitest';

import { eventEnvelopeForTest } from '@/src/core/control-plane/emitter';

describe('control-plane event envelope', () => {
  it('attaches required envelope fields from spine + trace', () => {
    const enveloped = eventEnvelopeForTest({
      event_name: 'slip_submitted',
      timestamp: '2026-01-20T10:00:00.000Z',
      request_id: 'req-1',
      trace_id: 'trace-1',
      agent_id: 'slip_ingestion',
      model_version: 'runtime-deterministic-v1',
      properties: {}
    }, {
      sport: 'NFL',
      tz: 'UTC',
      date: '2026-01-20',
      mode: 'cache',
      reason: 'fallback_due_to_provider_unavailable'
    });

    expect(enveloped.trace_id).toBe('trace-1');
    expect(enveloped.mode).toBe('cache');
    expect(enveloped.reason).toBe('fallback_due_to_provider_unavailable');
    expect(enveloped.sport).toBe('NFL');
    expect(enveloped.tz).toBe('UTC');
    expect(enveloped.date).toBe('2026-01-20');
  });
});
