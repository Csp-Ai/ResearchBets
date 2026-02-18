import { afterEach, describe, expect, it, vi } from 'vitest';

import { InMemoryEventEmitter } from '../src/core/control-plane/emitter';
import {
  getMetricEventValidationMode,
  validateMetricEvent,
} from '../src/core/control-plane/metricEventValidator';

describe('metric event validator', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.METRIC_EVENT_VALIDATION;
  });

  it('returns warnings for missing required fields in warn mode without throwing', () => {
    const result = validateMetricEvent(
      {
        event_name: 'calibration_update',
        properties: {},
      },
      'warn',
    );

    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('missing required properties');
    expect(result.shouldThrow).toBe(false);
  });

  it('uses warn as default mode when env var is unset', () => {
    expect(getMetricEventValidationMode()).toBe('warn');
  });

  it('logs warning through emitter and does not crash in warn mode', () => {
    process.env.METRIC_EVENT_VALIDATION = 'warn';
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const emitter = new InMemoryEventEmitter();

    expect(() =>
      emitter.emit({
        event_name: 'edge_realized_logged',
        timestamp: new Date().toISOString(),
        request_id: 'req-1',
        trace_id: 'trace-1',
        run_id: 'run-1',
        session_id: 'session-1',
        user_id: 'user-1',
        agent_id: 'metrics',
        model_version: 'v1',
        properties: {},
      }),
    ).not.toThrow();

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(emitter.getEvents()).toHaveLength(1);
  });
});
