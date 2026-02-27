import { appendQuery } from '@/src/components/landing/navigation';

type SearchParamsLike = {
  get: (key: string) => string | null;
};

export function getQueryTraceId(searchParamsLike: SearchParamsLike): string | null {
  const traceId = searchParamsLike.get('trace_id') ?? searchParamsLike.get('trace');
  if (!traceId) return null;
  const trimmed = traceId.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function withTraceId(path: string, trace_id: string): string {
  return appendQuery(path, { trace_id });
}
