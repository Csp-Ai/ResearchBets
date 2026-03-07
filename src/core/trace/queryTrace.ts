import { appendQuery } from '@/src/components/landing/navigation';

type SearchParamsLike = {
  get: (key: string) => string | null;
};

export function getQueryTraceId(searchParamsLike: SearchParamsLike): string | null {
  const canonicalTraceId = searchParamsLike.get('trace_id');
  // Compatibility boundary: legacy keys are read-only fallbacks for older deep-links.
  const traceId = canonicalTraceId ?? searchParamsLike.get('traceId') ?? searchParamsLike.get('trace');
  if (!traceId) return null;
  const trimmed = traceId.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function withTraceId(path: string, trace_id: string): string {
  return appendQuery(path, { trace_id });
}
