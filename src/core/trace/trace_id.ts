import { z } from 'zod';

import type { Spine } from '@/src/core/nervous/spine';

export const TraceIdSchema = z.string().min(8);

const read = (search: URLSearchParams | undefined, body: Record<string, unknown> | undefined, key: string): string | null => {
  const fromSearch = search?.get(key);
  if (typeof fromSearch === 'string' && fromSearch.trim().length > 0) return fromSearch.trim();
  const fromBody = body?.[key];
  if (typeof fromBody === 'string' && fromBody.trim().length > 0) return fromBody.trim();
  return null;
};

export function resolveTraceId(params: { search?: URLSearchParams; body?: unknown; headers?: Headers }): string | null {
  const body = params.body && typeof params.body === 'object' ? params.body as Record<string, unknown> : undefined;
  return read(params.search, body, 'trace_id')
    ?? read(params.search, body, 'traceId')
    ?? null;
}

export function ensureTraceId(spine: Spine): { trace_id: string; spine: Spine } {
  const current = typeof spine.trace_id === 'string' && spine.trace_id.trim().length > 0 ? spine.trace_id.trim() : null;
  const trace_id = current ?? crypto.randomUUID();
  return { trace_id, spine: { ...spine, trace_id } };
}
