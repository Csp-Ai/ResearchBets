import { z } from 'zod';

const MarketTypeSchema = z.enum([
  'spread',
  'total',
  'moneyline',
  'points',
  'threes',
  'rebounds',
  'assists',
  'ra',
  'pra'
]);

const SourceReferenceSchema = z.object({
  provider: z.string().min(1),
  url: z.string().url(),
  retrievedAt: z.string().datetime()
});

const PlatformLineFactSchema = z.object({
  platform: z.enum(['FanDuel', 'PrizePicks', 'Kalshi']),
  marketType: MarketTypeSchema,
  player: z.string().min(1),
  line: z.number(),
  odds: z.number().optional(),
  payout: z.number().optional(),
  asOf: z.string().datetime(),
  sources: z.array(SourceReferenceSchema)
});

const LegHitProfileSchema = z.object({
  selection: z.string().min(1),
  marketType: MarketTypeSchema,
  hitRate: z.object({
    l5: z.number(),
    l10: z.number(),
    seasonAvg: z.number(),
    vsOpponent: z.number().optional()
  }),
  lineContext: z.object({
    platformLines: z.array(PlatformLineFactSchema),
    consensusLine: z.number().nullable(),
    divergence: z.object({
      spread: z.number(),
      warning: z.boolean(),
      bestLine: PlatformLineFactSchema.optional(),
      worstLine: PlatformLineFactSchema.optional()
    })
  }),
  verdict: z.object({
    score: z.number().min(0).max(100),
    label: z.enum(['Strong', 'Lean', 'Pass']),
    riskTag: z.enum(['Low', 'Medium', 'High'])
  }),
  fallbackReason: z.string().optional(),
  provenance: z.object({
    asOf: z.string().datetime(),
    sources: z.array(SourceReferenceSchema)
  })
});

export const EvidenceItemSchema = z.object({
  id: z.string().min(1),
  sourceType: z.enum(['odds', 'injury', 'stats', 'news', 'model', 'other']),
  sourceName: z.string().min(1),
  sourceUrl: z.string().url().optional(),
  retrievedAt: z.string().datetime(),
  observedAt: z.string().datetime().optional(),
  contentExcerpt: z.string().min(1),
  contentHash: z.string().min(1),
  licenseHint: z.string().optional(),
  raw: z.record(z.unknown()).optional(),
  reliability: z.number().min(0).max(1).optional(),
  tags: z.array(z.string()).optional(),
  suspicious: z.boolean().optional()
});

export const ClaimSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  confidence: z.number().min(0).max(1),
  rationale: z.string().min(1),
  evidenceIds: z.array(z.string().min(1)).min(1)
});

export const ResearchReportSchema = z
  .object({
    reportId: z.string().min(1),
    runId: z.string().min(1),
    traceId: z.string().min(1),
    createdAt: z.string().datetime(),
    subject: z.string().min(1),
    claims: z.array(ClaimSchema),
    evidence: z.array(EvidenceItemSchema),
    summary: z.string().min(1),
    confidenceSummary: z.object({
      averageClaimConfidence: z.number().min(0).max(1),
      deterministic: z.literal(true)
    }),
    risks: z.array(z.string()),
    assumptions: z.array(z.string()),
    legs: z
      .array(
        z.object({
          selection: z.string().min(1),
          market: z.string().optional(),
          odds: z.string().optional(),
          team: z.string().optional(),
          gameId: z.string().optional()
        })
      )
      .optional(),
    legHitProfiles: z.array(LegHitProfileSchema).optional(),
    transparency: z
      .object({
        countsByInsightType: z.record(z.number()),
        fragilityVariables: z.array(
          z.object({
            insightId: z.string().min(1),
            claim: z.string().min(1),
            confidence: z.number().min(0).max(1),
            impactDelta: z.number().min(0)
          })
        ),
        disagreementProxyByType: z.record(z.number()),
        performance: z
          .object({
            edges_total: z.number(),
            edges_confirmed: z.number(),
            edges_missed: z.number(),
            calibration_score: z.number(),
            avg_delta: z.number(),
            disagreement_rate: z.number()
          })
          .optional()
      })
      .optional()
  })
  .superRefine((report, ctx) => {
    const ids = new Set(report.evidence.map((e) => e.id));
    report.claims.forEach((claim, i) => {
      claim.evidenceIds.forEach((id, j) => {
        if (!ids.has(id)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['claims', i, 'evidenceIds', j],
            message: `Unknown evidence ${id}`
          });
        }
      });
    });
  });
