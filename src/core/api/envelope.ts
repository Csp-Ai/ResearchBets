import { createTraceId } from '../agent-runtime/ids';

export type ApiEnvelope<T> = {
  ok: boolean;
  data: T | null;
  degraded: boolean;
  source: string;
  error_code: string | null;
  trace_id: string;
};

const extractTraceIdFromUrl = (request: Request): string | null => {
  try {
    const url = new URL(request.url);
    return url.searchParams.get('trace_id');
  } catch {
    return null;
  }
};

const extractTraceIdFromHeaders = (request: Request): string | null =>
  request.headers.get('x-trace-id') ?? request.headers.get('trace_id');

export const resolveTraceId = (request: Request, ...candidates: Array<string | null | undefined>): string => {
  for (const candidate of candidates) {
    if (candidate && candidate.trim().length > 0) return candidate;
  }

  const fromUrl = extractTraceIdFromUrl(request);
  if (fromUrl && fromUrl.trim().length > 0) return fromUrl;

  const fromHeaders = extractTraceIdFromHeaders(request);
  if (fromHeaders && fromHeaders.trim().length > 0) return fromHeaders;

  return createTraceId();
};

export const successEnvelope = <T>(input: {
  data: T;
  traceId: string;
  degraded?: boolean;
  source?: string;
}): ApiEnvelope<T> => ({
  ok: true,
  data: input.data,
  degraded: input.degraded ?? false,
  source: input.source ?? 'live',
  error_code: null,
  trace_id: input.traceId
});

export const errorEnvelope = (input: {
  traceId: string;
  errorCode: string;
  source?: string;
  degraded?: boolean;
}): ApiEnvelope<null> => ({
  ok: false,
  data: null,
  degraded: input.degraded ?? false,
  source: input.source ?? 'unknown',
  error_code: input.errorCode,
  trace_id: input.traceId
});
