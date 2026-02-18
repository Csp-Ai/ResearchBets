'use client';

import { createClientRequestId } from '../identifiers/session';

export type LivePollEventName = 'live_poll_tick' | 'live_poll_degraded';

export type LivePollEvent = {
  eventName: LivePollEventName;
  traceId: string;
  pollKey: string;
  failureCount: number;
  intervalMs?: number;
  reason?: string;
};

type PollError = {
  status?: number;
  networkError?: boolean;
  message?: string;
};

const inflightByKey = new Map<string, Promise<void>>();

export function computeJitterMs(input: {
  minIntervalMs: number;
  maxIntervalMs: number;
  random?: () => number;
}): number {
  const random = input.random ?? Math.random;
  const span = Math.max(0, input.maxIntervalMs - input.minIntervalMs);
  return Math.round(input.minIntervalMs + span * random());
}

export function computeBackoffMs(input: {
  failureCount: number;
  baseBackoffMs: number;
  maxBackoffMs: number;
}): number {
  if (input.failureCount <= 0) return 0;
  const exponent = Math.max(0, input.failureCount - 1);
  return Math.min(input.baseBackoffMs * 2 ** exponent, input.maxBackoffMs);
}

function shouldBackoff(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  if (typeof error !== 'object' || error == null) return false;
  const candidate = error as PollError;
  return candidate.status === 429 || candidate.networkError === true;
}

async function emitLivePollEvent(event: LivePollEvent): Promise<void> {
  await fetch('/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event_name: event.eventName,
      timestamp: new Date().toISOString(),
      request_id: createClientRequestId(),
      trace_id: event.traceId,
      run_id: createClientRequestId(),
      session_id: 'client',
      user_id: 'client',
      agent_id: 'ui',
      model_version: 'live-poll-v1',
      properties: {
        poll_key: event.pollKey,
        failure_count: event.failureCount,
        interval_ms: event.intervalMs,
        reason: event.reason
      }
    })
  });
}

export function createLivePoller(input: {
  key: string;
  traceId: () => string;
  run: () => Promise<void>;
  maxFailures?: number;
  minIntervalMs?: number;
  maxIntervalMs?: number;
  baseBackoffMs?: number;
  maxBackoffMs?: number;
  random?: () => number;
  documentRef?: Document | null;
  emitEvent?: (event: LivePollEvent) => Promise<void>;
  onDegraded?: (failureCount: number) => void;
}): { start: () => void; stop: () => void } {
  const maxFailures = input.maxFailures ?? 5;
  const minIntervalMs = input.minIntervalMs ?? 15_000;
  const maxIntervalMs = input.maxIntervalMs ?? 30_000;
  const baseBackoffMs = input.baseBackoffMs ?? 1_000;
  const maxBackoffMs = input.maxBackoffMs ?? 60_000;
  const random = input.random ?? Math.random;
  const emitEvent = input.emitEvent ?? emitLivePollEvent;
  const documentRef = input.documentRef ?? (typeof document === 'undefined' ? null : document);

  let stopped = true;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let failureCount = 0;
  let degraded = false;

  const clearTimer = () => {
    if (!timer) return;
    clearTimeout(timer);
    timer = null;
  };

  const schedule = (delayMs: number) => {
    if (stopped || degraded) return;
    clearTimer();
    timer = setTimeout(
      () => {
        void tick();
      },
      Math.max(0, delayMs)
    );
  };

  const getDelay = (useBackoff: boolean): number => {
    if (useBackoff) {
      return computeBackoffMs({
        failureCount,
        baseBackoffMs,
        maxBackoffMs
      });
    }
    return computeJitterMs({ minIntervalMs, maxIntervalMs, random });
  };

  const runDeduped = async () => {
    const active = inflightByKey.get(input.key);
    if (active) return active;

    const next = input
      .run()
      .finally(() => {
        if (inflightByKey.get(input.key) === next) inflightByKey.delete(input.key);
      })
      .then(() => undefined);
    inflightByKey.set(input.key, next);
    return next;
  };

  const tick = async () => {
    if (stopped || degraded) return;
    if (documentRef?.hidden) return;

    await emitEvent({
      eventName: 'live_poll_tick',
      traceId: input.traceId(),
      pollKey: input.key,
      failureCount
    });

    try {
      await runDeduped();
      failureCount = 0;
      schedule(getDelay(false));
    } catch (error) {
      failureCount += 1;
      if (failureCount >= maxFailures) {
        degraded = true;
        input.onDegraded?.(failureCount);
        await emitEvent({
          eventName: 'live_poll_degraded',
          traceId: input.traceId(),
          pollKey: input.key,
          failureCount,
          reason: error instanceof Error ? error.message : 'poll_failed'
        });
        return;
      }

      schedule(getDelay(shouldBackoff(error)));
    }
  };

  const onVisibilityChange = () => {
    if (stopped || degraded) return;
    if (documentRef?.hidden) {
      clearTimer();
      return;
    }
    schedule(0);
  };

  return {
    start: () => {
      if (!stopped) return;
      stopped = false;
      documentRef?.addEventListener('visibilitychange', onVisibilityChange);
      if (!documentRef?.hidden) {
        void tick();
      }
    },
    stop: () => {
      stopped = true;
      clearTimer();
      documentRef?.removeEventListener('visibilitychange', onVisibilityChange);
    }
  };
}
