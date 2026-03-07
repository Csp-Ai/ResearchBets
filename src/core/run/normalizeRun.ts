import type { Run } from '@/src/core/run/types';

type RunInput = Partial<Run> & { trace_id?: string; traceId?: string };

export function normalizeRun(input: RunInput): Run {
  const canonicalTraceId = input.trace_id ?? input.traceId;
  if (!canonicalTraceId) {
    throw new Error('Run trace_id is required.');
  }

  return {
    trace_id: canonicalTraceId,
    traceId: input.traceId,
    slipId: input.slipId,
    snapshotId: input.snapshotId,
    anonSessionId: input.anonSessionId,
    requestId: input.requestId,
    createdAt: input.createdAt ?? new Date().toISOString(),
    updatedAt: input.updatedAt ?? new Date().toISOString(),
    status: input.status ?? 'running',
    slipText: input.slipText ?? '',
    extractedLegs: input.extractedLegs ?? [],
    enrichedLegs: input.enrichedLegs ?? [],
    analysis: input.analysis ?? {
      confidencePct: 35,
      weakestLegId: null,
      reasons: ['No analysis available.'],
      riskLabel: 'Weak',
      computedAt: new Date().toISOString()
    },
    report: input.report,
    sources: input.sources ?? { stats: 'fallback', injuries: 'fallback', odds: 'fallback' },
    trustedContext: input.trustedContext,
    metadata: input.metadata
  };
}
