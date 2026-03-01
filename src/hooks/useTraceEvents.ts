'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { ControlPlaneEvent } from '@/src/components/AgentNodeGraph';

type UseTraceEventsArgs = {
  trace_id?: string;
  traceId?: string;
  limit?: number;
  pollIntervalMs?: number;
  enabled?: boolean;
};

type UseTraceEventsResult = {
  events: ControlPlaneEvent[];
  loading: boolean;
  error: string | null;
  isLive: boolean;
  refresh: () => Promise<void>;
};

type ApiEvent = {
  id?: string;
  event_name?: string;
  trace_id?: string;
  request_id?: string;
  timestamp?: string;
  created_at?: string;
  properties?: Record<string, unknown>;
  payload?: Record<string, unknown>;
  checksum?: string;
  type?: string;
};

function toNormalizedEvent(row: ApiEvent): ControlPlaneEvent | null {
  const payload = (row.payload ?? row.properties ?? {}) as Record<string, unknown>;
  const eventName = row.event_name ?? row.type ?? (typeof payload.event_name === 'string' ? payload.event_name : undefined);
  if (!eventName) return null;
  return {
    id: row.id,
    event_name: String(eventName),
    trace_id: String(row.trace_id ?? payload.trace_id ?? ''),
    request_id: row.request_id ? String(row.request_id) : undefined,
    created_at: String(row.created_at ?? row.timestamp ?? payload.timestamp ?? ''),
    payload,
  };
}

function dedupeKey(event: ControlPlaneEvent): string {
  if (event.id) return `id:${event.id}`;
  const payloadKey = (event.payload as { checksum?: string } | undefined)?.checksum ?? JSON.stringify(event.payload ?? {});
  return `${event.event_name}|${event.created_at ?? ''}|${payloadKey}`;
}

function eventTimestamp(event: ControlPlaneEvent): number {
  const ts = Date.parse(event.created_at ?? '');
  return Number.isFinite(ts) ? ts : 0;
}

export function mergeTraceEvents(previous: ControlPlaneEvent[], incoming: ControlPlaneEvent[]): ControlPlaneEvent[] {
  if (incoming.length === 0) return previous;

  const merged = [...previous];
  const seen = new Set(previous.map(dedupeKey));
  let hasOlderInsert = false;

  for (const event of incoming) {
    const key = dedupeKey(event);
    if (seen.has(key)) continue;
    seen.add(key);
    const lastEvent = merged[merged.length - 1];
    if (!lastEvent || eventTimestamp(event) >= eventTimestamp(lastEvent)) {
      merged.push(event);
      continue;
    }
    hasOlderInsert = true;
    merged.push(event);
  }

  if (hasOlderInsert) {
    merged.sort((a, b) => eventTimestamp(a) - eventTimestamp(b));
  }

  return merged;
}

const NO_EVENT_BACKOFF_THRESHOLD = 3;
const MAX_BACKOFF_MULTIPLIER = 4;
const HIDDEN_POLL_INTERVAL_MS = 12_000;

export function useTraceEvents({ trace_id, traceId, limit = 20, pollIntervalMs = 2000, enabled = true }: UseTraceEventsArgs): UseTraceEventsResult {
  const activeTraceId = trace_id ?? traceId;
  const [events, setEvents] = useState<ControlPlaneEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const sinceRef = useRef<string | null>(null);
  const noNewPollsRef = useRef(0);
  const backoffRef = useRef(1);

  const isLive = Boolean(enabled && activeTraceId);

  const refresh = useCallback(async () => {
    if (!activeTraceId) {
      setEvents([]);
      sinceRef.current = null;
      noNewPollsRef.current = 0;
      backoffRef.current = 1;
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setLoading(true);
      const params = new URLSearchParams({ trace_id: activeTraceId, limit: String(limit) });
      if (sinceRef.current) params.set('since', sinceRef.current);

      const response = await fetch(`/api/events?${params.toString()}`, {
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`Failed loading events (${response.status})`);
      }
      const payload = (await response.json()) as { events?: ApiEvent[] };
      const incoming = (payload.events ?? [])
        .map(toNormalizedEvent)
        .filter((event): event is ControlPlaneEvent => Boolean(event))
        .sort((a, b) => eventTimestamp(a) - eventTimestamp(b));

      if (incoming.length === 0) {
        noNewPollsRef.current += 1;
        if (noNewPollsRef.current >= NO_EVENT_BACKOFF_THRESHOLD) {
          backoffRef.current = Math.min(MAX_BACKOFF_MULTIPLIER, backoffRef.current + 1);
        }
      } else {
        noNewPollsRef.current = 0;
        backoffRef.current = 1;
        sinceRef.current = incoming[incoming.length - 1]?.created_at ?? sinceRef.current;
      }

      setEvents((previous) => mergeTraceEvents(previous, incoming));
      setError(null);
    } catch (caught) {
      if ((caught as Error)?.name !== 'AbortError') {
        setError(caught instanceof Error ? caught.message : 'Failed to fetch events');
      }
    } finally {
      setLoading(false);
    }
  }, [activeTraceId, limit]);

  useEffect(() => {
    if (!isLive) return;

    let timer: number | undefined;
    let isCancelled = false;

    const schedule = () => {
      if (isCancelled) return;
      const isHidden = typeof document !== 'undefined' && document.visibilityState === 'hidden';
      const nextInterval = isHidden
        ? Math.max(HIDDEN_POLL_INTERVAL_MS, pollIntervalMs)
        : pollIntervalMs * backoffRef.current;

      timer = window.setTimeout(async () => {
        await refresh();
        schedule();
      }, nextInterval);
    };

    void refresh();
    schedule();

    return () => {
      isCancelled = true;
      if (timer) window.clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [isLive, pollIntervalMs, refresh]);

  useEffect(() => {
    if (!activeTraceId) {
      setEvents([]);
      setError(null);
      setLoading(false);
      sinceRef.current = null;
      noNewPollsRef.current = 0;
      backoffRef.current = 1;
    }
  }, [activeTraceId]);

  return useMemo(
    () => ({
      events,
      loading,
      error,
      isLive,
      refresh,
    }),
    [error, events, isLive, loading, refresh],
  );
}
