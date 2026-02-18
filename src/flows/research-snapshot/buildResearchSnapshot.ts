import { InMemoryEventEmitter } from '../../core/control-plane/emitter';
import type { ResearchTier } from '../../core/connectors/Connector';
import type { ResearchReport } from '../../core/evidence/evidenceSchema';
import { buildResearchSnapshot as buildResearchSnapshotV2 } from '../researchSnapshot/buildResearchSnapshot';

export interface ResearchSnapshotInput {
  sport: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  marketType?: string;
  seed?: string;
}

export const buildResearchSnapshot = async (
  input: ResearchSnapshotInput,
  context: { requestId: string; runId?: string; traceId?: string; userId?: string | null; environment?: 'dev' | 'staging' | 'prod' },
  options?: { tier?: ResearchTier },
): Promise<ResearchReport> => {
  const emitter = new InMemoryEventEmitter();
  return buildResearchSnapshotV2(
    {
      subject: `${input.sport}:${input.league}:${input.awayTeam}@${input.homeTeam}`,
      sessionId: 'legacy-session',
      userId: context.userId ?? 'legacy-user',
      tier: options?.tier ?? 'free',
      environment: context.environment ?? 'dev',
      seed: input.seed ?? context.requestId,
      requestId: context.requestId,
      traceId: context.traceId ?? `trace-${context.requestId}`,
      runId: context.runId ?? `run-${context.requestId}`,
    },
    emitter,
    process.env,
  );
};
