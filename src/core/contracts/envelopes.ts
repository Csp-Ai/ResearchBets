import { z } from 'zod';

export const TraceContextSchema = z.object({
  trace_id: z.string().min(1),
  sport: z.string().min(1),
  tz: z.string().min(1),
  date: z.string().min(1),
  mode: z.enum(['demo', 'live'])
});

export const TodayPayloadSchema = z.object({
  mode: z.enum(['live', 'cache', 'demo']),
  reason: z.string().optional(),
  generatedAt: z.string().optional(),
  trace_id: z.string().min(1).optional(),
  slip_id: z.string().uuid().optional(),
  traceId: z.string().min(1).optional(),
  provenance: z
    .object({
      mode: z.enum(['live', 'cache', 'demo']),
      reason: z.string().optional(),
      generatedAt: z.string()
    })
    .optional(),
  intent: z
    .object({
      mode: z.enum(['live', 'cache', 'demo']),
      sport: z.string().optional(),
      tz: z.string().optional(),
      date: z.string().optional()
    })
    .optional(),
  effective: z
    .object({
      mode: z.enum(['live', 'cache', 'demo']),
      reason: z.string().optional()
    })
    .optional(),

  status: z.enum(['active', 'next', 'market_closed']).optional(),
  nextAvailableStartTime: z.string().optional(),
  providerHealth: z
    .array(
      z.object({
        provider: z.string().min(1),
        ok: z.boolean(),
        message: z.string().optional(),
        missingKey: z.boolean().optional()
      })
    )
    .optional(),
  games: z.array(
    z.object({
      id: z.string().min(1),
      matchup: z.string().min(1),
      startTime: z.string().min(1)
    })
  ),
  board: z.array(
    z
      .object({
        id: z.string().min(1),
        gameId: z.string().min(1),
        player: z.string().min(1),
        market: z.string().min(1),
        line: z.string(),
        odds: z.string().min(1),
        l10Avg: z.number().optional(),
        threesAttL1: z.number().optional(),
        threesAttL3Avg: z.number().optional(),
        threesAttL5Avg: z.number().optional(),
        fgaL1: z.number().optional(),
        fgaL3Avg: z.number().optional(),
        fgaL5Avg: z.number().optional(),
        attemptsSource: z.enum(['live', 'cached', 'demo', 'heuristic']).optional()
      })
      .passthrough()
  )
});

export const SlipSubmitRequestSchema = z
  .object({
    anon_session_id: z.string().min(1).optional(),
    user_id: z.string().nullable().optional(),
    source: z.enum(['paste', 'upload']).optional(),
    raw_text: z.string().trim().min(1).max(6000).optional(),
    request_id: z.string().min(1).optional(),
    trace_id: z.string().min(1).optional(),
    slip_id: z.string().uuid().optional(),
    anon_id: z.string().min(1).optional(),
    source_type: z.enum(['self', 'shared']).optional(),
    spine: z
      .object({
        sport: z.string().min(1),
        tz: z.string().min(1),
        date: z.string().min(1),
        mode: z.enum(['live', 'demo', 'cache']),
        anon_id: z.string().optional(),
        slip_id: z.string().uuid().optional(),
        user_id: z.string().nullable().optional()
      })
      .optional(),
    legs: z.array(z.record(z.unknown())).optional()
  })
  .refine((value) => Boolean(value.raw_text) || Boolean(value.legs && value.legs.length > 0), {
    message: 'Either raw_text or legs is required.'
  });

export const SlipSubmitResultSchema = z.object({
  slip_id: z.string().uuid(),
  trace_id: z.string().min(1),
  anon_id: z.string().min(1),
  spine: z.record(z.unknown()),
  trace: z.record(z.unknown()),
  parse: z.object({
    confidence: z.number().min(0).max(1),
    legs_count: z.number().int().min(0),
    needs_review: z.boolean()
  })
});

export const SlipExtractRequestSchema = z.object({
  slip_id: z.string().uuid(),
  request_id: z.string().min(1),
  anon_session_id: z.string().min(1)
});

export const SlipExtractResultSchema = z.object({
  slip_id: z.string().uuid(),
  extracted_legs: z.array(z.record(z.unknown())),
  leg_insights: z.array(z.record(z.unknown())),
  trace_id: z.string().min(1)
});

export const EventEnvelopeSchema = z.object({
  trace_id: z.string().min(1),
  phase: z.enum(['BEFORE', 'DURING', 'AFTER']),
  type: z.string().min(1),
  payload: z.unknown(),
  timestamp: z.string().datetime()
});

export const GovernorReportSchema = z.object({
  ok: z.boolean(),
  trace_id: z.string().min(1),
  checks: z.array(
    z.object({
      id: z.string().min(1),
      level: z.enum(['error', 'warn', 'info']),
      pass: z.boolean(),
      message: z.string().min(1)
    })
  )
});
