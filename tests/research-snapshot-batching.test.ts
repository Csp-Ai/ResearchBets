import { describe, expect, it, vi } from 'vitest';

import { InMemoryEventEmitter } from '../src/core/control-plane/emitter';
import { MemoryRuntimeStore } from '../src/core/persistence/runtimeDb';
import { buildResearchSnapshot } from '../src/flows/researchSnapshot/buildResearchSnapshot';
import { scoreLiveLegVerdict } from '../src/flows/researchSnapshot/verdict';

const mocks = vi.hoisted(() => ({
  fetchRecentPlayerGameLogs: vi.fn(async () => ({ byPlayerId: { 'LeBron James': [], 'Anthony Davis': [] }, provenance: { asOf: new Date().toISOString(), sources: [] } })),
  fetchSeasonPlayerAverages: vi.fn(async () => ({ byPlayerId: { 'LeBron James': { playerId: 'LeBron James', games: 10, averages: { points: 26 } }, 'Anthony Davis': { playerId: 'Anthony Davis', games: 10, averages: { points: 24 } } }, provenance: { asOf: new Date().toISOString(), sources: [] } })),
  fetchEvents: vi.fn(async () => ({ events: [{ id: 'evt-1' }], provenance: { asOf: new Date().toISOString(), sources: [] } })),
  fetchEventOdds: vi.fn(async () => ({ platformLines: [], provenance: { asOf: new Date().toISOString(), sources: [] } }))
}));

vi.mock('../src/core/providers/registry', () => ({
  computeHitRate: (logs: Array<{ stats?: { points?: number } }>) => {
    const vals = logs.map((l) => l.stats?.points).filter((v): v is number => typeof v === 'number');
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  },
  providerRegistry: {
    oddsProvider: { fetchEventOdds: mocks.fetchEventOdds },
    statsProvider: {
      fetchRecentPlayerGameLogs: mocks.fetchRecentPlayerGameLogs,
      fetchSeasonPlayerAverages: mocks.fetchSeasonPlayerAverages,
      fetchVsOpponentHistory: vi.fn()
    }
  },
  createProviderRegistry: () => ({
    statsProvider: {
      fetchRecentPlayerGameLogs: mocks.fetchRecentPlayerGameLogs,
      fetchSeasonPlayerAverages: mocks.fetchSeasonPlayerAverages,
      fetchVsOpponentHistory: vi.fn()
    },
    oddsProvider: { fetchEvents: mocks.fetchEvents, fetchEventOdds: mocks.fetchEventOdds }
  })
}));

describe('snapshot batching', () => {
  it('fetches stats/odds once per unique player/event set, not per leg', async () => {
    const report = await buildResearchSnapshot(
      {
        subject: 'nba:NBA:LAL@BOS:LeBron James points over 24.5, Anthony Davis points over 21.5, LeBron James points over 25.5',
        sessionId: 's',
        userId: 'u',
        tier: 'free',
        environment: 'dev',
        seed: 'seed',
        requestId: 'req',
        traceId: 'tr',
        runId: 'run',
        marketType: 'points'
      },
      new InMemoryEventEmitter(),
      process.env,
      new MemoryRuntimeStore()
    );

    expect(report.legHitProfiles?.length ?? 0).toBeGreaterThan(0);
    expect(mocks.fetchRecentPlayerGameLogs).toHaveBeenCalledTimes(1);
    expect(mocks.fetchSeasonPlayerAverages).toHaveBeenCalledTimes(1);
    expect(mocks.fetchEventOdds).toHaveBeenCalledTimes(1);
    expect(mocks.fetchEvents).toHaveBeenCalledTimes(1);
  });

  it('verdict scoring prioritizes l5/l10 over season reference', () => {
    const highRecent = scoreLiveLegVerdict({
      selection: 'P',
      marketType: 'points',
      hitProfile: { hitProfile: { l5: 30, l10: 28, seasonAvg: 15 }, provenance: { asOf: '', sources: [] } },
      lineContext: { platformLines: [], consensusLine: null, divergence: { spread: 0, bestLine: null, worstLine: null, warning: false }, provenance: { asOf: '', sources: [] } },
      opponentContext: { provenance: { asOf: '', sources: [] } },
      injury: { tags: [], severity: 'low', provenance: { asOf: '', sources: [] } },
      verdict: { score: 0, label: 'Pass', riskTag: 'Low' }
    });
    const lowRecentHighSeason = scoreLiveLegVerdict({
      selection: 'P',
      marketType: 'points',
      hitProfile: { hitProfile: { l5: 10, l10: 10, seasonAvg: 35 }, provenance: { asOf: '', sources: [] } },
      lineContext: { platformLines: [], consensusLine: null, divergence: { spread: 0, bestLine: null, worstLine: null, warning: false }, provenance: { asOf: '', sources: [] } },
      opponentContext: { provenance: { asOf: '', sources: [] } },
      injury: { tags: [], severity: 'low', provenance: { asOf: '', sources: [] } },
      verdict: { score: 0, label: 'Pass', riskTag: 'Low' }
    });

    expect(highRecent.score).toBeGreaterThan(lowRecentHighSeason.score);
  });
});
