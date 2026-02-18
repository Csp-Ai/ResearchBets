import { describe, expect, it } from 'vitest';

import { executeAgent } from '../../../core/agent-runtime/executeAgent';
import { InMemoryTraceEmitter } from '../../../core/agent-runtime/trace';
import type { EvidenceItem } from '../../../core/evidence/evidenceSchema';
import { ResearchReportSchema } from '../../../core/evidence/validators';
import { ResearchSnapshotAgent } from '../ResearchSnapshotAgent';
import { buildResearchSnapshot } from '../../../flows/research-snapshot/buildResearchSnapshot';
import type { SourceProvider } from '../../../core/sources/types';

const baseInput = {
  sport: 'basketball',
  league: 'NBA',
  homeTeam: 'Lakers',
  awayTeam: 'Celtics',
  marketType: 'spread',
  seed: 'seed-123',
};

describe('ResearchSnapshotAgent', () => {
  it('returns valid ResearchReport and emits required runtime trace events', async () => {
    const traceEmitter = new InMemoryTraceEmitter();

    const response = await executeAgent(
      ResearchSnapshotAgent,
      baseInput,
      {
        requestId: 'req-research-1',
        traceEmitter,
        environment: 'dev',
      },
    );

    expect(response.ok).toBe(true);
    if (!response.ok) {
      return;
    }

    const parsed = ResearchReportSchema.parse(response.result);
    expect(parsed.runId).toBe(response.runId);
    expect(parsed.traceId).toBe(response.traceId);

    expect(traceEmitter.getEvents().map((event) => event.eventName)).toEqual([
      'RUN_STARTED',
      'INPUT_VALIDATED',
      'AGENT_STARTED',
      'AGENT_FINISHED',
      'OUTPUT_VALIDATED',
      'RUN_FINISHED',
    ]);

    for (const claim of parsed.claims) {
      expect(claim.evidenceIds.length).toBeGreaterThanOrEqual(1);
      for (const evidenceId of claim.evidenceIds) {
        expect(parsed.evidence.some((item) => item.id === evidenceId)).toBe(true);
      }
    }
  });

  it('produces deterministic confidence values for a fixed seed', async () => {
    const first = await executeAgent(ResearchSnapshotAgent, baseInput, { requestId: 'req-1', environment: 'dev' });
    const second = await executeAgent(ResearchSnapshotAgent, baseInput, { requestId: 'req-1', environment: 'dev' });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);

    if (first.ok && second.ok) {
      const firstConfidence = first.result.claims.map((claim) => claim.confidence);
      const secondConfidence = second.result.claims.map((claim) => claim.confidence);
      expect(firstConfidence).toEqual(secondConfidence);
    }
  });

  it('dedupes provider output by sourceType + contentExcerpt hash', async () => {
    const duplicateEvidence: EvidenceItem = {
      id: 'dup-1',
      sourceType: 'stats',
      sourceName: 'Dup Stats',
      retrievedAt: '2026-01-01T00:00:00.000Z',
      observedAt: '2025-12-31T00:00:00.000Z',
      contentExcerpt: 'same excerpt',
      reliability: 0.8,
      raw: { homePace: 99, awayPace: 95, homeEff: 118, awayEff: 114 },
    };

    const providerA: SourceProvider = {
      id: 'dup-a',
      sourceType: 'stats',
      reliabilityDefault: 0.8,
      fetch: async () => [duplicateEvidence],
    };

    const providerB: SourceProvider = {
      id: 'dup-b',
      sourceType: 'stats',
      reliabilityDefault: 0.8,
      fetch: async () => [{ ...duplicateEvidence, id: 'dup-2' }],
    };

    const report = await buildResearchSnapshot(baseInput, { requestId: 'req-dedupe' }, { providers: [providerA, providerB] });

    expect(report.evidence).toHaveLength(1);
    expect(report.claims.every((claim) => claim.evidenceIds.length >= 1)).toBe(true);
  });
});
