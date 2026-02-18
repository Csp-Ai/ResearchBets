import { z } from 'zod';

import { InMemoryEventEmitter } from '../../core/control-plane/emitter';
import { buildResearchSnapshot } from '../../flows/researchSnapshot/buildResearchSnapshot';
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
  handler: async (context, input) => {
    const emitter = new InMemoryEventEmitter();
    return buildResearchSnapshot(
      {
        subject: `${input.sport}:${input.league}:${input.awayTeam}@${input.homeTeam}`,
        sessionId: context.sessionId ?? `session_${context.requestId}`,
        userId: context.userId ?? `anon_${context.requestId}`,
        tier: 'free',
        environment: context.environment ?? 'dev',
        seed: input.seed ?? context.requestId,
        requestId: context.requestId,
        traceId: context.traceId ?? `trace_${context.requestId}`,
        runId: context.runId ?? `run_${context.requestId}`,
      },
      emitter,
      process.env,
    );
  },
};
