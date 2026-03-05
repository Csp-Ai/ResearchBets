import 'server-only';

import { normalizeSpineWithWarnings, parseSpineFromSearch } from '@/src/core/nervous/spine';
import { ensureTraceId, resolveTraceId } from '@/src/core/trace/trace_id';

export function getTraceContext(request: Request, options?: { requireTraceId?: boolean; body?: unknown }) {
  const url = new URL(request.url);
  const parsed = parseSpineFromSearch(url.searchParams);
  const body = options?.body && typeof options.body === 'object' ? bodyToRecord(options.body) : {};

  const normalized = normalizeSpineWithWarnings({
    ...body,
    ...(body.spine && typeof body.spine === 'object' ? body.spine as Record<string, unknown> : {}),
    ...parsed,
    trace_id: resolveTraceId({ search: url.searchParams, body, headers: request.headers }) ?? parsed.trace_id
  });

  const ensured = ensureTraceId(normalized.spine);
  return {
    ...ensured.spine,
    spine: ensured.spine,
    trace_id: ensured.trace_id,
    warnings: normalized.warnings
  };
}

function bodyToRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object') return {};
  return value as Record<string, unknown>;
}
