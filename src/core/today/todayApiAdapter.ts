import { z } from 'zod';

import { TodayPayloadSchema } from '@/src/core/contracts/envelopes';

const ErrorSchema = z.object({ code: z.string(), message: z.string() });

const TodayEnvelopeSchema = z.union([
  z.object({
    ok: z.literal(true),
    data: TodayPayloadSchema,
    provenance: z.object({ mode: z.enum(['live', 'cache', 'demo']), reason: z.string().optional(), generatedAt: z.string() }).optional(),
    trace_id: z.string().min(1),
    landing: z.record(z.unknown()).optional(),
  }),
  z.object({
    ok: z.literal(false),
    error: ErrorSchema,
    provenance: z.object({ mode: z.enum(['live', 'cache', 'demo']), reason: z.string().optional(), generatedAt: z.string() }).optional(),
    trace_id: z.string().min(1).optional(),
  })
]);

export function parseTodayEnvelope(payload: unknown) {
  return TodayEnvelopeSchema.safeParse(payload);
}
