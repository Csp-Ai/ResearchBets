import { resolveTraceId as resolveCanonicalTraceId } from '../trace/trace_id';

export type ApiEnvelope<T> = {
  ok: boolean;
  data: T | null;
  degraded: boolean;
  source: string;
  error_code: string | null;
  trace_id: string | null;
};

const extractTraceIdFromUrl = (request: Request): string | null => {
  try {
    const url = new URL(request.url);
    return resolveCanonicalTraceId({ search: url.searchParams });
  } catch {
    return null;
  }
};

const extractTraceIdFromHeaders = (request: Request): string | null =>
  request.headers.get('x-trace-id')?.trim() || request.headers.get('trace_id')?.trim() || null;

export const resolveTraceId = (request: Request, ...candidates: Array<string | null | undefined>): string | null => {
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) return candidate.trim();
  }

  const fromUrl = extractTraceIdFromUrl(request);
  if (fromUrl) return fromUrl;

  const fromHeaders = extractTraceIdFromHeaders(request);
  if (fromHeaders) return fromHeaders;

  return null;
};

export const successEnvelope = <T>(input: {
  data: T;
  traceId?: string | null;
  degraded?: boolean;
  source?: string;
}): ApiEnvelope<T> => ({
  ok: true,
  data: input.data,
  degraded: input.degraded ?? false,
  source: input.source ?? 'live',
  error_code: null,
  trace_id: input.traceId ?? null
});

export const errorEnvelope = (input: {
  traceId?: string | null;
  errorCode: string;
  source?: string;
  degraded?: boolean;
}): ApiEnvelope<null> => ({
  ok: false,
  data: null,
  degraded: input.degraded ?? false,
  source: input.source ?? 'unknown',
  error_code: input.errorCode,
  trace_id: input.traceId ?? null
});
