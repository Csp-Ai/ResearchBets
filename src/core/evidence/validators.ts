import { z } from 'zod';

export const EvidenceSourceTypeSchema = z.enum(['odds', 'injury', 'stats', 'news', 'model', 'other']);

export const EvidenceItemSchema = z.object({
  id: z.string().min(1),
  sourceType: EvidenceSourceTypeSchema,
  sourceName: z.string().min(1),
  sourceUrl: z.string().url().optional(),
  retrievedAt: z.string().datetime(),
  observedAt: z.string().datetime().optional(),
  contentExcerpt: z.string().min(1),
  raw: z.record(z.unknown()).optional(),
  reliability: z.number().min(0).max(1).optional(),
  tags: z.array(z.string()).optional(),
});

export const ClaimSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  confidence: z.number().min(0).max(1),
  rationale: z.string().min(1),
  evidenceIds: z.array(z.string().min(1)).min(1),
  relatedEntities: z.array(z.string()).optional(),
});

export const ResearchReportSchema = z.object({
  reportId: z.string().min(1),
  runId: z.string().min(1),
  traceId: z.string().min(1),
  createdAt: z.string().datetime(),
  subject: z.string().min(1),
  claims: z.array(ClaimSchema),
  evidence: z.array(EvidenceItemSchema),
  summary: z.string().min(1),
  risks: z.array(z.string()),
  assumptions: z.array(z.string()),
});

export type EvidenceItemValidated = z.infer<typeof EvidenceItemSchema>;
export type ClaimValidated = z.infer<typeof ClaimSchema>;
export type ResearchReportValidated = z.infer<typeof ResearchReportSchema>;
