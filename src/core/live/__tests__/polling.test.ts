import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  computeBackoffMs,
  computeJitterMs,
  createLivePoller,
  type LivePollEvent
} from '../polling';

function createDocumentStub(hidden = false) {
  const listeners = new Map<string, Set<() => void>>();
  return {
    get hidden() {
      return hidden;
    },
    set hidden(value: boolean) {
      hidden = value;
    },
    addEventListener(event: string, handler: () => void) {
      const bucket = listeners.get(event) ?? new Set<() => void>();
      bucket.add(handler);
      listeners.set(event, bucket);
    },
    removeEventListener(event: string, handler: () => void) {
      listeners.get(event)?.delete(handler);
    },
    dispatch(event: string) {
      listeners.get(event)?.forEach((handler) => handler());
    }
  };
}

describe('polling utilities', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('computes jitter between min and max interval', () => {
    expect(computeJitterMs({ minIntervalMs: 15_000, maxIntervalMs: 30_000, random: () => 0 })).toBe(
      15_000
    );
    expect(computeJitterMs({ minIntervalMs: 15_000, maxIntervalMs: 30_000, random: () => 1 })).toBe(
      30_000
    );
  });

  it('computes exponential backoff capped by max', () => {
    expect(computeBackoffMs({ failureCount: 1, baseBackoffMs: 1_000, maxBackoffMs: 16_000 })).toBe(
      1_000
    );
    expect(computeBackoffMs({ failureCount: 3, baseBackoffMs: 1_000, maxBackoffMs: 16_000 })).toBe(
      4_000
    );
    expect(computeBackoffMs({ failureCount: 8, baseBackoffMs: 1_000, maxBackoffMs: 16_000 })).toBe(
      16_000
    );
  });

  it('backs off after 429 errors and degrades after max failures', async () => {
    vi.useFakeTimers();
    const events: LivePollEvent[] = [];
    const run = vi.fn().mockRejectedValue({ status: 429, message: 'rate_limited' });

    const poller = createLivePoller({
      key: 'games:nfl',
      traceId: () => 'trace-1',
      run,
      maxFailures: 3,
      emitEvent: async (event) => {
        events.push(event);
      },
      documentRef: null,
      baseBackoffMs: 100,
      maxBackoffMs: 500
    });

    poller.start();
    await vi.runOnlyPendingTimersAsync();
    await vi.runOnlyPendingTimersAsync();
    await vi.runOnlyPendingTimersAsync();

    expect(run).toHaveBeenCalledTimes(3);
    expect(events.filter((event) => event.eventName === 'live_poll_tick')).toHaveLength(3);
    expect(events.some((event) => event.eventName === 'live_poll_degraded')).toBe(true);
  });

  it('dedupes in-flight executions by key', async () => {
    vi.useFakeTimers();
    let resolver: (() => void) | undefined;
    const run = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolver = resolve;
        })
    );

    const pollerA = createLivePoller({
      key: 'detail:1',
      traceId: () => 'trace-1',
      run,
      emitEvent: async () => undefined,
      random: () => 0,
      minIntervalMs: 20,
      maxIntervalMs: 20,
      documentRef: null
    });

    const pollerB = createLivePoller({
      key: 'detail:1',
      traceId: () => 'trace-2',
      run,
      emitEvent: async () => undefined,
      random: () => 0,
      minIntervalMs: 20,
      maxIntervalMs: 20,
      documentRef: null
    });

    pollerA.start();
    pollerB.start();
    await vi.advanceTimersByTimeAsync(0);

    expect(run).toHaveBeenCalledTimes(1);

    if (resolver) resolver();
    await Promise.resolve();

    pollerA.stop();
    pollerB.stop();
  });

  it('pauses while document is hidden and resumes when visible', async () => {
    vi.useFakeTimers();
    const doc = createDocumentStub(true);
    const run = vi.fn().mockResolvedValue(undefined);

    const poller = createLivePoller({
      key: 'games:nba',
      traceId: () => 'trace-1',
      run,
      emitEvent: async () => undefined,
      random: () => 0,
      minIntervalMs: 50,
      maxIntervalMs: 50,
      documentRef: doc as unknown as Document
    });

    poller.start();
    await vi.advanceTimersByTimeAsync(60);
    expect(run).toHaveBeenCalledTimes(0);

    doc.hidden = false;
    doc.dispatch('visibilitychange');
    await vi.advanceTimersByTimeAsync(0);
    expect(run).toHaveBeenCalledTimes(1);

    poller.stop();
  });
});
