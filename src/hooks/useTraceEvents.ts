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

export function useTraceEvents({ trace_id, traceId, limit = 120, pollIntervalMs = 2000, enabled = true }: UseTraceEventsArgs): UseTraceEventsResult {
  const activeTraceId = trace_id ?? traceId;
  const [events, setEvents] = useState<ControlPlaneEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const isLive = Boolean(enabled && activeTraceId);

  const refresh = useCallback(async () => {
    if (!activeTraceId) {
      setEvents([]);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setLoading(true);
      const response = await fetch(`/api/events?trace_id=${encodeURIComponent(activeTraceId)}&limit=${limit}`, {
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`Failed loading events (${response.status})`);
      }
      const payload = (await response.json()) as { events?: ApiEvent[] };
      const incoming = (payload.events ?? []).map(toNormalizedEvent).filter((event): event is ControlPlaneEvent => Boolean(event));

      setEvents((previous) => {
        const map = new Map<string, ControlPlaneEvent>();
        for (const event of [...previous, ...incoming]) {
          map.set(dedupeKey(event), event);
        }
        return [...map.values()].sort(
          (a, b) => new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime(),
        );
      });
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
    void refresh();
    const timer = window.setInterval(() => {
      void refresh();
    }, pollIntervalMs);

    return () => {
      window.clearInterval(timer);
      abortRef.current?.abort();
    };
  }, [isLive, pollIntervalMs, refresh]);

  useEffect(() => {
    if (!activeTraceId) {
      setEvents([]);
      setError(null);
      setLoading(false);
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
