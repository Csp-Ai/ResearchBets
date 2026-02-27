import { createClientRequestId } from '@/src/core/identifiers/session';

type CanonicalTraceIdInput = {
  explicitTraceId?: string | null;
  existingEntityTraceId?: string | null;
  requestTraceId?: string | null;
};

const asValidTraceId = (value?: string | null): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export function canonicalTraceId(input: CanonicalTraceIdInput): string {
  return asValidTraceId(input.explicitTraceId)
    ?? asValidTraceId(input.existingEntityTraceId)
    ?? asValidTraceId(input.requestTraceId)
    ?? createClientRequestId();
}
