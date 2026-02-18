import { z } from 'zod';

import { buildResearchSnapshot } from '../../flows/research-snapshot/buildResearchSnapshot';
import { ResearchReportSchema } from '../../core/evidence/validators';
import type { AgentDefinition } from '../../core/agent-runtime/types';

const ResearchSnapshotInputSchema = z.object({
  sport: z.string().min(1),
  league: z.string().min(1),
  matchupId: z.string().min(1).optional(),
  homeTeam: z.string().min(1),
  awayTeam: z.string().min(1),
  gameTime: z.string().datetime().optional(),
  marketType: z.string().min(1).optional(),
  seed: z.string().min(1).optional(),
});

export type ResearchSnapshotAgentInput = z.infer<typeof ResearchSnapshotInputSchema>;
export type ResearchSnapshotAgentOutput = z.infer<typeof ResearchReportSchema>;

export const ResearchSnapshotAgent: AgentDefinition<ResearchSnapshotAgentInput, ResearchSnapshotAgentOutput> = {
  id: 'researchSnapshot',
  version: '0.1.0',
  inputSchema: ResearchSnapshotInputSchema,
  outputSchema: ResearchReportSchema,
  handler: async (context, input) =>
    buildResearchSnapshot(input, {
      requestId: context.requestId,
      runId: context.runId,
      traceId: context.traceId,
      traceEmitter: context.traceEmitter,
      environment: context.environment,
      userId: context.userId,
    }),
};
