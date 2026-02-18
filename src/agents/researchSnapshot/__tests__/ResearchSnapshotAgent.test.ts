import { describe, expect, it } from 'vitest';

import { executeAgent } from '../../../core/agent-runtime/executeAgent';
import { InMemoryEventEmitter } from '../../../core/control-plane/emitter';
import { ResearchReportSchema } from '../../../core/evidence/validators';
import { MemoryRuntimeStore } from '../../../core/persistence/runtimeDb';
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

  it('persists marketType-scoped recommendations with prop fallback', async () => {
    process.env.ODDS_CONNECTOR_KEY = 'x';
    process.env.STATS_CONNECTOR_KEY = 'x';
    process.env.NEWS_CONNECTOR_KEY = 'x';

    const store = new MemoryRuntimeStore();
    const gameId = `${baseInput.sport}:${baseInput.league}:${baseInput.awayTeam}@${baseInput.homeTeam}`;

    await buildResearchSnapshot(
      {
        subject: gameId,
        sessionId: 's3',
        userId: 'u3',
        tier: 'free',
        environment: 'dev',
        seed: 'seed-abc',
        requestId: 'req-3',
        traceId: 'trace-3',
        runId: 'run-3',
      },
      new InMemoryEventEmitter(),
      process.env,
      store,
    );

    const fallbackRecommendations = await store.listRecommendationsByGame(gameId);
    expect(fallbackRecommendations[0]?.marketType).toBe('points');

    await buildResearchSnapshot(
      {
        subject: gameId,
        sessionId: 's4',
        userId: 'u4',
        tier: 'free',
        environment: 'dev',
        seed: 'seed-def',
        requestId: 'req-4',
        traceId: 'trace-4',
        runId: 'run-4',
        marketType: 'rebounds',
      },
      new InMemoryEventEmitter(),
      process.env,
      store,
    );

    const scopedRecommendations = await store.listRecommendationsByGame(gameId);
    expect(scopedRecommendations.some((recommendation) => recommendation.marketType === 'rebounds')).toBe(true);
  });
});
