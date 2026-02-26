import { z } from 'zod';

const ApiErrorSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
});

const SlipSubmitDataSchema = z.object({
  slip_id: z.string().uuid(),
  trace_id: z.string().min(1),
  anon_id: z.string().min(1),
  spine: z.record(z.unknown()),
  trace: z.record(z.unknown()),
  parse: z.object({
    confidence: z.number().min(0).max(1),
    legs_count: z.number().int().min(0),
    needs_review: z.boolean(),
  }),
});

const SlipExtractDataSchema = z.object({
  slip_id: z.string().uuid(),
  extracted_legs: z.array(z.record(z.unknown())),
  leg_insights: z.array(z.record(z.unknown())),
  trace_id: z.string().min(1),
});

const SubmitEnvelope = z.union([
  z.object({ ok: z.literal(true), data: SlipSubmitDataSchema, trace_id: z.string().min(1) }),
  z.object({ ok: z.literal(false), error: ApiErrorSchema, trace_id: z.string().min(1) }),
]);

const ExtractEnvelope = z.union([
  z.object({ ok: z.literal(true), data: SlipExtractDataSchema, trace_id: z.string().min(1) }),
  z.object({ ok: z.literal(false), error: ApiErrorSchema, trace_id: z.string().min(1) }),
]);

export function parseSlipSubmitEnvelope(payload: unknown) {
  return SubmitEnvelope.safeParse(payload);
}

export function parseSlipExtractEnvelope(payload: unknown) {
  return ExtractEnvelope.safeParse(payload);
}
