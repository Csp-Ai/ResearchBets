import { describe, expect, it } from 'vitest';

import { executeAgent } from '../../../core/agent-runtime/executeAgent';
import { ResearchReportSchema } from '../../../core/evidence/validators';
import { buildResearchSnapshot } from '../../../flows/research-snapshot/buildResearchSnapshot';
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

    const first = await buildResearchSnapshot(baseInput, { requestId: 'req-1', environment: 'dev' });
    const second = await buildResearchSnapshot(baseInput, { requestId: 'req-1', environment: 'dev' });

    expect(first.evidence.map((item) => item.contentHash)).toEqual(second.evidence.map((item) => item.contentHash));
  });
});
