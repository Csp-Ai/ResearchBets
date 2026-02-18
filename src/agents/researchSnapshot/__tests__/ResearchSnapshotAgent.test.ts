import { describe, expect, it } from 'vitest';

import { executeAgent } from '../../../core/agent-runtime/executeAgent';
import { InMemoryEventEmitter } from '../../../core/control-plane/emitter';
import { ResearchReportSchema } from '../../../core/evidence/validators';
import { buildResearchSnapshot } from '../../../flows/researchSnapshot/buildResearchSnapshot';
import { ResearchSnapshotAgent } from '../ResearchSnapshotAgent';

const baseInput = {
  sport: 'basketball',
  league: 'NBA',
  homeTeam: 'Lakers',
  awayTeam: 'Celtics',
  marketType: 'spread',
  seed: 'seed-123',
};

describe('ResearchSnapshotAgent', () => {
  it('returns valid ResearchReport', async () => {
    process.env.ODDS_CONNECTOR_KEY = 'x';
    process.env.STATS_CONNECTOR_KEY = 'x';
    process.env.NEWS_CONNECTOR_KEY = 'x';

    const response = await executeAgent(ResearchSnapshotAgent, baseInput, { requestId: 'req-research-1', environment: 'dev' });
    expect(response.ok).toBe(true);
    if (!response.ok) return;
    const parsed = ResearchReportSchema.parse(response.result);
    expect(parsed.traceId).toBe(response.traceId);
  });

  it('is deterministic for same seed', async () => {
    process.env.ODDS_CONNECTOR_KEY = 'x';
    process.env.STATS_CONNECTOR_KEY = 'x';
    process.env.NEWS_CONNECTOR_KEY = 'x';

    const first = await buildResearchSnapshot(
      {
        subject: `${baseInput.sport}:${baseInput.league}:${baseInput.awayTeam}@${baseInput.homeTeam}`,
        sessionId: 's1',
        userId: 'u1',
        tier: 'free',
        environment: 'dev',
        seed: baseInput.seed,
        requestId: 'req-1',
        traceId: 'trace-1',
        runId: 'run-1',
      },
      new InMemoryEventEmitter(),
      process.env,
    );
    const second = await buildResearchSnapshot(
      {
        subject: `${baseInput.sport}:${baseInput.league}:${baseInput.awayTeam}@${baseInput.homeTeam}`,
        sessionId: 's2',
        userId: 'u2',
        tier: 'free',
        environment: 'dev',
        seed: baseInput.seed,
        requestId: 'req-2',
        traceId: 'trace-2',
        runId: 'run-2',
      },
      new InMemoryEventEmitter(),
      process.env,
    );

    expect(first.evidence.map((item) => item.contentHash)).toEqual(second.evidence.map((item) => item.contentHash));
  });
});
